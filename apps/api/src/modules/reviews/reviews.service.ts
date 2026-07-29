import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createReview(
    userId: string,
    data: { orderId: string; rating: number; comment?: string },
  ) {
    const { orderId, rating, comment } = data;

    // Validate rating range
    if (!rating || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Validate order exists and belongs to user
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { vendor: { include: { user: true } }, user: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only review your own orders');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('You can only review delivered orders');
    }

    // Check if review already exists for this order
    const existingReview = await this.prisma.review.findUnique({
      where: { orderId },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this order');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        userId,
        orderId,
        vendorId: order.vendorId,
        rating,
        comment: comment || null,
      },
      include: { user: { select: { name: true } } },
    });

    // Recalculate vendor avgRating
    const avgResult = await this.prisma.review.aggregate({
      where: { vendorId: order.vendorId },
      _avg: { rating: true },
    });

    await this.prisma.vendor.update({
      where: { id: order.vendorId },
      data: { avgRating: avgResult._avg.rating || 5.0 },
    });

    // Send notification to vendor
    await this.notificationsService.send({
      userId: order.vendor.userId,
      title: 'New Review Received',
      body: `${order.user.name} rated your order ${rating}⭐`,
      type: 'REVIEW',
    });

    return review;
  }

  async getVendorReviews(vendorId: string, page = 1, limit = 10) {
    // Validate vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const skip = (page - 1) * limit;

    // Fetch paginated reviews
    const [reviews, totalReviews] = await Promise.all([
      this.prisma.review.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { name: true } },
        },
      }),
      this.prisma.review.count({ where: { vendorId } }),
    ]);

    // Compute avg and breakdown
    const avgResult = await this.prisma.review.aggregate({
      where: { vendorId },
      _avg: { rating: true },
    });

    // Rating breakdown
    const breakdownRaw = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { vendorId },
      _count: { rating: true },
    });

    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const row of breakdownRaw) {
      breakdown[row.rating] = row._count.rating;
    }

    return {
      reviews,
      avgRating: avgResult._avg.rating || 0,
      totalReviews,
      breakdown,
      page,
      limit,
      totalPages: Math.ceil(totalReviews / limit),
    };
  }

  async addVendorResponse(reviewId: string, vendorUserId: string, vendorResponse: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { vendor: true },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Verify the vendor owns this review
    if (review.vendor.userId !== vendorUserId) {
      throw new ForbiddenException('You can only respond to reviews for your restaurant');
    }

    if (!vendorResponse || !vendorResponse.trim()) {
      throw new BadRequestException('Response cannot be empty');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { vendorResponse: vendorResponse.trim() },
      include: { user: { select: { name: true } } },
    });
  }
}
