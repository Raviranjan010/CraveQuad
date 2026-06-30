import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VendorStatus } from '@prisma/client';

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.vendor.findMany({
      where: { status: VendorStatus.APPROVED },
    });
  }

  async findOne(id: string) {
    return this.prisma.vendor.findUnique({
      where: { id },
      include: { menuItems: true },
    });
  }
}
