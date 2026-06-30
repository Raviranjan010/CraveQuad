import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(vendorId: string) {
    // Boilerplate for vendor dashboard stats
    return { vendorId, ordersCount: 0, revenue: 0 };
  }
}
