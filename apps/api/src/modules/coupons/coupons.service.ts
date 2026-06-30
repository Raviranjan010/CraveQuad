import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async validateCoupon(code: string, orderAmount: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) {
      return { valid: false, message: 'Invalid or inactive coupon' };
    }
    if (orderAmount < coupon.minOrderAmount) {
      return { valid: false, message: `Minimum order amount is ${coupon.minOrderAmount}` };
    }
    return { valid: true, coupon };
  }
}
