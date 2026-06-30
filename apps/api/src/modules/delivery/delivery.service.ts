import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeliveryService {
  constructor(private prisma: PrismaService) {}

  async getActiveDeliveries(partnerId: string) {
    return this.prisma.order.findMany({
      where: {
        deliveryPartnerId: partnerId,
        status: { in: ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'] },
      },
    });
  }
}
