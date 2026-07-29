import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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

  async create(data: any, vendorUserId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: vendorUserId },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found for this user');
    }

    // Resolve or create category
    let categoryId = data.categoryId;
    if (!categoryId && data.categoryName) {
      let category = await this.prisma.menuCategory.findFirst({
        where: { vendorId: vendor.id, name: data.categoryName },
      });
      if (!category) {
        category = await this.prisma.menuCategory.create({
          data: {
            vendorId: vendor.id,
            name: data.categoryName,
          },
        });
      }
      categoryId = category.id;
    }

    if (!categoryId) {
      throw new BadRequestException('Category is required');
    }

    return this.prisma.menuItem.create({
      data: {
        vendorId: vendor.id,
        categoryId,
        name: data.name,
        description: data.description || '',
        price: parseFloat(data.price),
        prepTimeMinutes: parseInt(data.prepTimeMinutes || '10', 10),
        isVeg: data.isVeg ?? true,
        isAvailable: data.isAvailable ?? true,
        discountPercent: data.discountPercent ? parseFloat(data.discountPercent) : null,
        imageUrl: data.imageUrl || null,
      },
      include: {
        category: true,
      },
    });
  }

  async update(id: string, data: any, vendorUserId: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { vendor: true },
    });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    if (item.vendor.userId !== vendorUserId) {
      throw new ForbiddenException('You do not own this menu item');
    }

    let categoryId = data.categoryId;
    if (!categoryId && data.categoryName) {
      let category = await this.prisma.menuCategory.findFirst({
        where: { vendorId: item.vendorId, name: data.categoryName },
      });
      if (!category) {
        category = await this.prisma.menuCategory.create({
          data: {
            vendorId: item.vendorId,
            name: data.categoryName,
          },
        });
      }
      categoryId = category.id;
    }

    const updateData = { ...data };
    delete updateData.categoryName;
    if (categoryId) {
      updateData.categoryId = categoryId;
    }

    // Parse values if provided
    if (updateData.price !== undefined) {
      updateData.price = parseFloat(updateData.price);
    }
    if (updateData.prepTimeMinutes !== undefined) {
      updateData.prepTimeMinutes = parseInt(updateData.prepTimeMinutes, 10);
    }
    if (updateData.discountPercent !== undefined) {
      updateData.discountPercent = updateData.discountPercent ? parseFloat(updateData.discountPercent) : null;
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });
  }

  async delete(id: string, vendorUserId: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { vendor: true },
    });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    if (item.vendor.userId !== vendorUserId) {
      throw new ForbiddenException('You do not own this menu item');
    }
    return this.prisma.menuItem.delete({
      where: { id },
    });
  }

  async createCategory(name: string, vendorUserId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: vendorUserId },
    });
    if (!vendor) throw new NotFoundException('Vendor profile not found');

    const existing = await this.prisma.menuCategory.findFirst({
      where: { vendorId: vendor.id, name },
    });
    if (existing) throw new BadRequestException('Category already exists');

    return this.prisma.menuCategory.create({
      data: {
        vendorId: vendor.id,
        name,
      },
    });
  }

  async updateCategory(id: string, name: string, vendorUserId: string) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id },
      include: { vendor: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (category.vendor.userId !== vendorUserId) {
      throw new ForbiddenException('Unauthorized');
    }

    return this.prisma.menuCategory.update({
      where: { id },
      data: { name },
    });
  }

  async deleteCategory(id: string, vendorUserId: string) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id },
      include: { vendor: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (category.vendor.userId !== vendorUserId) {
      throw new ForbiddenException('Unauthorized');
    }

    return this.prisma.menuCategory.delete({
      where: { id },
    });
  }
}
