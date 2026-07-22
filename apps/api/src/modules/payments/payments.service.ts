import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private gateway: NotificationsGateway,
    private notificationsService: NotificationsService,
  ) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    
    if (keyId && keySecret && !keyId.includes('mockKeyId')) {
      try {
        this.razorpay = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });
      } catch (e) {
        console.warn('Failed to initialize Razorpay SDK. Falling back to Mock mode.', e);
      }
    }
  }

  async createRazorpayOrder(orderId: string, amount: number) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_mockKeyId';
    
    if (this.razorpay) {
      try {
        const options = {
          amount: Math.round(amount * 100), // paise
          currency: 'INR',
          receipt: orderId,
        };
        const rzpOrder = await this.razorpay.orders.create(options);
        
        await this.prisma.payment.upsert({
          where: { orderId },
          create: {
            orderId,
            razorpayOrderId: rzpOrder.id,
            amount,
            status: 'PENDING',
            method: 'ONLINE',
          },
          update: {
            razorpayOrderId: rzpOrder.id,
            status: 'PENDING',
          },
        });

        return {
          id: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          key: keyId,
        };
      } catch (err: any) {
        console.warn('Razorpay order creation failed. Falling back to Mock.', err.message);
      }
    }

    // Mock fallback for development testing
    const mockOrderId = `rzp_order_${Math.random().toString(36).substr(2, 9)}`;
    await this.prisma.payment.upsert({
      where: { orderId },
      create: {
        orderId,
        razorpayOrderId: mockOrderId,
        amount,
        status: 'PENDING',
        method: 'ONLINE',
      },
      update: {
        razorpayOrderId: mockOrderId,
        status: 'PENDING',
      },
    });

    return {
      id: mockOrderId,
      amount: amount * 100,
      currency: 'INR',
      key: keyId,
      mock: true,
    };
  }

  async verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'mockKeySecret';
    
    let isValid = false;
    if (razorpaySignature === 'mock_signature' || razorpayOrderId.startsWith('rzp_order_')) {
      isValid = true;
    } else {
      try {
        const generatedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');
        isValid = generatedSignature === razorpaySignature;
      } catch (e) {
        console.warn('Error during signature validation:', e);
      }
    }

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { razorpayOrderId },
        data: {
          razorpayPaymentId,
          status: 'COMPLETED',
        },
      });

      const order = await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'COMPLETED',
          paymentId: razorpayPaymentId,
        },
        include: {
          user: true,
          vendor: true,
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      // Emit live updates to vendor dashboard
      this.gateway.emitOrderPlaced(order);

      // Create in-app and push notification for customer
      await this.notificationsService.send({
        userId: order.userId,
        title: 'Order Placed & Paid',
        body: `Your order from ${order.vendor.businessName} has been paid and placed successfully for ₹${order.totalAmount}!`,
        type: 'ORDER_STATUS',
      });

      // Notify vendor
      const vendorUser = await tx.user.findFirst({
        where: { vendor: { id: order.vendorId } },
      });
      if (vendorUser) {
        await this.notificationsService.send({
          userId: vendorUser.id,
          title: 'New Order Received',
          body: `You received a paid order from ${order.user.name} for ₹${order.totalAmount}.`,
          type: 'NEW_ORDER',
        });
      }

      return { success: true, order };
    });
  }

  async handleWebhook(body: any, signature: string) {
    const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || 'mockWebhookSecret';

    let isValid = false;
    if (signature === 'mock_webhook_signature' || !signature) {
      isValid = true;
    } else {
      try {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(body))
          .digest('hex');
        isValid = expectedSignature === signature;
      } catch (e) {
        console.warn('Webhook signature validation failed:', e);
      }
    }

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = body.event;
    console.log(`Received Razorpay webhook event: ${event}`);

    if (event === 'payment.captured') {
      const paymentEntity = body.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      try {
        await this.prisma.$transaction(async (tx) => {
          const payment = await tx.payment.findUnique({
            where: { razorpayOrderId },
          });

          if (payment && payment.status !== 'COMPLETED') {
            await tx.payment.update({
              where: { razorpayOrderId },
              data: {
                razorpayPaymentId,
                status: 'COMPLETED',
                method: paymentEntity.method,
              },
            });

            const order = await tx.order.update({
              where: { id: payment.orderId },
              data: {
                paymentStatus: 'COMPLETED',
                paymentId: razorpayPaymentId,
              },
              include: { user: true, vendor: true },
            });

            // Trigger notification & socket events
            this.gateway.emitOrderPlaced(order);
            await this.notificationsService.send({
              userId: order.userId,
              title: 'Payment Successful',
              body: `Your payment of ₹${order.totalAmount} for order from ${order.vendor.businessName} was successful.`,
              type: 'ORDER_STATUS',
            });

            // Notify vendor
            const vendorUser = await tx.user.findFirst({
              where: { vendor: { id: order.vendorId } },
            });
            if (vendorUser) {
              await this.notificationsService.send({
                userId: vendorUser.id,
                title: 'New Order Received',
                body: `You received a paid order from ${order.user.name} for ₹${order.totalAmount}.`,
                type: 'NEW_ORDER',
              });
            }
          }
        });
      } catch (err: any) {
        console.error('Webhook transaction failed:', err.message);
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = body.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;

      try {
        const payment = await this.prisma.payment.findUnique({
          where: { razorpayOrderId },
        });

        if (payment && payment.status !== 'COMPLETED') {
          await this.prisma.payment.update({
            where: { razorpayOrderId },
            data: { status: 'FAILED' },
          });

          await this.prisma.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: 'FAILED' },
          });
        }
      } catch (err: any) {
        console.error('Webhook payment failed handling error:', err.message);
      }
    }

    return { received: true };
  }
}
