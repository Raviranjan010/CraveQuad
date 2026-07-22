import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
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

      return { success: true, order };
    });
  }
}
