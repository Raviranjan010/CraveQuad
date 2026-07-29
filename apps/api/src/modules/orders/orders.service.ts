import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { PaymentsService } from '../payments/payments.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private notificationsService: NotificationsService,
    private gateway: NotificationsGateway,
    private paymentsService: PaymentsService,
  ) {}

  async createOrder(
    userId: string,
    data: {
      deliveryAddress: string;
      deliverySlot?: string;
      couponCode?: string;
      paymentMethod: 'COD' | 'ONLINE';
      idempotencyKey: string;
    },
  ) {
    const { deliveryAddress, deliverySlot, couponCode, paymentMethod, idempotencyKey } = data;

    // 1. Check Idempotency Key in Redis to prevent duplicate submissions
    const idempotencyKeyRedis = `CC:order_idempotency:${idempotencyKey}`;
    try {
      const existingOrderId = await this.redisService.get(idempotencyKeyRedis);
      if (existingOrderId) {
        console.log(`Duplicate order submit detected for key "${idempotencyKey}". Returning order ID: ${existingOrderId}`);
        return this.findOne(existingOrderId);
      }
    } catch (err: any) {
      console.warn(`Idempotency check failed in Redis: ${err.message}`);
    }

    // 2. Fetch User's Cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        vendor: true,
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // 3. Verify vendor is online and open
    if (!cart.vendor.isOpenNow) {
      throw new BadRequestException('Restaurant is currently closed and not accepting orders');
    }

    const subtotal = cart.items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

    // 4. Validate Coupon if provided
    let discount = 0;
    let couponId: string | null = null;

    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (!coupon || !coupon.isActive) {
        throw new BadRequestException('Invalid or inactive coupon code');
      }

      const now = new Date();
      if (now < coupon.validFrom || now > coupon.validTo) {
        throw new BadRequestException('Coupon code has expired or is not yet active');
      }

      if (subtotal < coupon.minOrderAmount) {
        throw new BadRequestException(`Minimum order amount of ₹${coupon.minOrderAmount} is required for this coupon`);
      }

      // Check usage limits
      const orderCountWithCoupon = await this.prisma.order.count({
        where: { discountAmount: { gt: 0 } },
      });
      if (orderCountWithCoupon >= coupon.usageLimit) {
        throw new BadRequestException('Coupon usage limit has been reached');
      }

      // Check per user limit
      const userOrderCountWithCoupon = await this.prisma.order.count({
        where: { userId, discountAmount: { gt: 0 } },
      });
      if (userOrderCountWithCoupon >= coupon.perUserLimit) {
        throw new BadRequestException('You have exceeded the usage limit for this coupon');
      }

      // Calculate discount
      if (coupon.discountType === 'FLAT') {
        discount = coupon.value;
      } else {
        discount = (subtotal * coupon.value) / 100;
        if (coupon.maxDiscount) {
          discount = Math.min(discount, coupon.maxDiscount);
        }
      }
      discount = Math.min(discount, subtotal);
      couponId = coupon.id;
    }

    // Calculate final totals
    const deliveryFee = 15.0; // standard fee
    const totalAmount = Math.max(0, subtotal + deliveryFee - discount);

    // 5. Execute Order Placement in a Transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Check menu items availability again inside transaction
      for (const item of cart.items) {
        const menuItem = await tx.menuItem.findUnique({
          where: { id: item.menuItemId },
        });
        if (!menuItem || !menuItem.isAvailable) {
          throw new BadRequestException(`Item "${item.menuItem.name}" is no longer available`);
        }
      }

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          userId,
          vendorId: cart.vendorId,
          totalAmount,
          deliveryFee,
          discountAmount: discount,
          deliveryAddress,
          deliverySlot,
          status: OrderStatus.PLACED,
          paymentStatus: PaymentStatus.PENDING,
          couponId,
          items: {
            create: cart.items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              priceAtOrder: item.menuItem.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
          vendor: true,
          user: true,
        },
      });

      // Clear Cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
      await tx.cart.delete({
        where: { id: cart.id },
      });

      return newOrder;
    });

    // 6. Set Idempotency Key in Redis for 1 hour to prevent duplicates
    try {
      await this.redisService.set(idempotencyKeyRedis, order.id, 3600);
    } catch (err: any) {
      console.warn(`Failed to store idempotency key in Redis: ${err.message}`);
    }

    // 7. Handle Payments
    if (paymentMethod === 'ONLINE') {
      const rzpDetails = await this.paymentsService.createRazorpayOrder(order.id, totalAmount);
      return {
        order,
        paymentMethod,
        razorpay: rzpDetails,
      };
    } else {
      // COD / Cash on Pickup
      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          razorpayOrderId: `cod_${order.id}_${Date.now()}`,
          amount: totalAmount,
          status: 'PENDING',
          method: 'COD',
        },
      });

      // Emit live updates
      this.gateway.emitOrderPlaced(order);

      // Create in-app and push notification for customer
      await this.notificationsService.send({
        userId,
        title: 'Order Placed (Pay on Pickup)',
        body: `Your order from ${order.vendor.businessName} has been placed successfully for ₹${totalAmount}. Please pay on pickup!`,
        type: 'ORDER_STATUS',
      });

      // Notify vendor about new order
      const vendorUser = await this.prisma.user.findUnique({
        where: { id: order.vendor.userId },
        select: { id: true },
      });
      if (vendorUser) {
        await this.notificationsService.send({
          userId: vendorUser.id,
          title: 'New Order Received',
          body: `You received a new order from ${order.user.name} for ₹${totalAmount} (COD).`,
          type: 'NEW_ORDER',
        });
      }

      return {
        order,
        paymentMethod,
      };
    }
  }

  async findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        vendor: true,
        deliveryPartner: { include: { user: true } },
        items: { include: { menuItem: true } },
        payment: true,
      },
    });
  }

  async findActiveVendorOrders(vendorUserId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: vendorUserId },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found for this user');
    }
    return this.prisma.order.findMany({
      where: {
        vendorId: vendor.id,
        status: {
          in: [
            OrderStatus.PLACED,
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        items: {
          include: {
            menuItem: true,
          },
        },
        payment: true,
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: true,
        items: { include: { menuItem: true } },
        payment: true,
      },
    });
  }

  async updateStatus(id: string, status: OrderStatus, actorRole?: string, actorUserId?: string) {
    const order = await this.findOne(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Role-based verification
    if (actorRole && actorUserId) {
      if (actorRole === 'VENDOR') {
        const vendor = await this.prisma.vendor.findUnique({
          where: { userId: actorUserId },
        });
        if (!vendor || order.vendorId !== vendor.id) {
          throw new BadRequestException('You are not authorized to update this order status');
        }
      } else if (actorRole === 'DELIVERY_PARTNER') {
        const rider = await this.prisma.deliveryPartner.findUnique({
          where: { userId: actorUserId },
        });
        if (!rider || order.deliveryPartnerId !== rider.id) {
          throw new BadRequestException('You are not authorized to update this order status');
        }
      }
    }

    // Update status
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: { user: true, vendor: true },
    });

    // Emit live status update via Socket.IO
    this.gateway.emitOrderStatusUpdated(id, status, updatedOrder.userId);

    // Send notifications to customer
    let title = 'Order Update';
    let body = `Your order status from ${updatedOrder.vendor.businessName} has been updated to ${status}.`;

    if (status === OrderStatus.ACCEPTED) {
      title = 'Order Accepted';
      body = `Your order from ${updatedOrder.vendor.businessName} has been accepted and is being prepared!`;
    } else if (status === OrderStatus.PREPARING) {
      title = 'Preparing Food';
      body = `${updatedOrder.vendor.businessName} is preparing your food now!`;
    } else if (status === OrderStatus.READY) {
      title = 'Order Ready for Pickup';
      body = `Your order is ready! Please pick it up from ${updatedOrder.vendor.businessName}.`;
    } else if (status === OrderStatus.OUT_FOR_DELIVERY) {
      title = 'Out for Delivery';
      body = `Your order is out for delivery! A rider is bringing it to your location.`;
    } else if (status === OrderStatus.DELIVERED) {
      title = 'Order Delivered';
      body = `Your order has been marked as delivered. Enjoy your meal!`;
    } else if (status === OrderStatus.CANCELLED) {
      title = 'Order Cancelled';
      body = `Your order from ${updatedOrder.vendor.businessName} was cancelled.`;
    }

    await this.notificationsService.send({
      userId: updatedOrder.userId,
      title,
      body,
      type: 'ORDER_STATUS',
    });

    return updatedOrder;
  }
}
