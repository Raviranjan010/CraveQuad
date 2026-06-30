import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@campus-crave/shared-types';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { menuItem: true } } },
    });
  }

  async updateStatus(id: string, status: OrderStatus) {
    // Map shared OrderStatus enum to Prisma schema OrderStatus enum
    return this.prisma.order.update({
      where: { id },
      data: { status: status as any },
    });
  }
}
