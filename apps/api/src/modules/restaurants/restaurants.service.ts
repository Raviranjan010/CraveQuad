import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VendorStatus, Prisma } from '@prisma/client';

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.vendor.findMany({
      where: { status: VendorStatus.APPROVED },
      include: {
        menuCategories: { select: { name: true } },
      },
    });
  }

  async findAllFiltered(filters: {
    campusId?: string;
    search?: string;
    vegOnly?: boolean;
    minRating?: number;
    sortBy?: string;
    page: number;
    limit: number;
  }) {
    const { campusId, search, vegOnly, minRating, sortBy, page, limit } = filters;
    const skip = (page - 1) * limit;

    // Build the query conditions
    const where: Prisma.VendorWhereInput = {
      status: VendorStatus.APPROVED,
    };

    if (campusId) {
      where.campusId = campusId;
    }

    if (minRating !== undefined) {
      where.avgRating = { gte: minRating };
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (vegOnly) {
      where.menuItems = {
        some: { isVeg: true },
        every: { isVeg: true },
      };
    }

    // Build ordering
    let orderBy: Prisma.VendorOrderByWithRelationInput = { avgRating: 'desc' }; // Default sort
    if (sortBy === 'rating') {
      orderBy = { avgRating: 'desc' };
    } else if (sortBy === 'orders') {
      orderBy = { totalOrders: 'desc' };
    }

    // Fetch restaurants and total count
    const [restaurants, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          menuCategories: {
            select: {
              name: true,
            },
          },
          coupons: {
            where: {
              isActive: true,
              validTo: { gte: new Date() },
            },
            select: {
              code: true,
              discountType: true,
              value: true,
            },
          },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      restaurants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return this.prisma.vendor.findUnique({
      where: { id },
      include: {
        campus: true,
        menuCategories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            menuItems: {
              where: { isAvailable: true },
            },
          },
        },
        coupons: {
          where: {
            isActive: true,
            validTo: { gte: new Date() },
          },
        },
      },
    });
  }
}
