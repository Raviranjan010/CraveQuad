import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async findByRestaurant(restaurantId: string) {
    return this.prisma.menuItem.findMany({
      where: { restaurantId, isAvailable: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.menuItem.findUnique({
      where: { id },
    });
  }
}
