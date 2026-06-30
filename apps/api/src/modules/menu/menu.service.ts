import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async findByRestaurant(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: { vendorId: restaurantId, isAvailable: true },
    });
  }

  async findFiltered(filters: {
    restaurantId?: string;
    categoryId?: string;
    search?: string;
    isVeg?: boolean;
    page: number;
    limit: number;
  }) {
    const { restaurantId, categoryId, search, isVeg, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.MenuItemWhereInput = {
      isAvailable: true,
    };

    if (restaurantId) {
      where.vendorId = restaurantId;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isVeg !== undefined) {
      where.isVeg = isVeg;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.menuItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              name: true,
            },
          },
          vendor: {
            select: {
              businessName: true,
            },
          },
        },
      }),
      this.prisma.menuItem.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return this.prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: true,
      },
    });
  }
}
