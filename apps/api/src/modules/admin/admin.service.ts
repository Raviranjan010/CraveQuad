import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getPlatformStats() {
    const totalUsers = await this.prisma.user.count();
    const totalRestaurants = await this.prisma.restaurant.count();
    const totalOrders = await this.prisma.order.count();
    return { totalUsers, totalRestaurants, totalOrders };
  }
}
