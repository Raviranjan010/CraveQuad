import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VendorStatus } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(vendorId: string) {
    // Return mock analytics and queues as requested
    const ordersCount = await this.prisma.order.count({
      where: { vendorId },
    });
    
    const revenueSum = await this.prisma.order.aggregate({
      where: { vendorId, status: 'DELIVERED' },
      _sum: { totalAmount: true },
    });

    const topItems = await this.prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: { order: { vendorId } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 3,
    });

    return {
      vendorId,
      ordersCount,
      revenue: revenueSum._sum.totalAmount || 0.0,
      topItems,
    };
  }

  async getProfileByUserId(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      include: { campus: true },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found for this user.');
    }
    return vendor;
  }

  async updateProfile(vendorId: string, dto: {
    businessName?: string;
    description?: string;
    logoUrl?: string;
    bannerUrl?: string;
    isOpenNow?: boolean;
    openingHours?: any;
  }) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found.');

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: dto,
    });
  }

  async findAllVendors(filters: { status?: VendorStatus; campusId?: string }) {
    return this.prisma.vendor.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.campusId && { campusId: filters.campusId }),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        campus: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async updateVendorStatus(vendorId: string, status: VendorStatus, rejectionReason?: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { user: true },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Vendor Status
      const updatedVendor = await tx.vendor.update({
        where: { id: vendorId },
        data: {
          status,
          isOpenNow: status === VendorStatus.APPROVED, // Open by default if approved
        },
      });

      // 2. Update User Verification status
      await tx.user.update({
        where: { id: vendor.userId },
        data: {
          isVerified: status === VendorStatus.APPROVED,
        },
      });

      // 3. Create Notification record
      let title = '';
      let body = '';
      if (status === VendorStatus.APPROVED) {
        title = 'Vendor Approval Successful';
        body = `Congratulations! Your canteen "${vendor.businessName}" has been approved. You now have full access to your vendor dashboard.`;
      } else if (status === VendorStatus.REJECTED) {
        title = 'Vendor Registration Rejected';
        body = `We regret to inform you that your registration for "${vendor.businessName}" was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`;
      } else if (status === VendorStatus.SUSPENDED) {
        title = 'Account Suspended';
        body = 'Your vendor account has been temporarily suspended by the campus administrator.';
      }

      await tx.notification.create({
        data: {
          userId: vendor.userId,
          title,
          body,
          type: 'SYSTEM',
        },
      });

      // 4. Send email stub
      console.log(`
[EmailStub] ----------------------------------------------------
[EmailStub] To: ${vendor.user.email}
[EmailStub] Subject: Onboarding Status Update - ${title}
[EmailStub] Body: Hi ${vendor.user.name},
[EmailStub] ${body}
[EmailStub] ----------------------------------------------------
      `);

      return updatedVendor;
    });
  }
}
