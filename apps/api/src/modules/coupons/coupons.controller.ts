import { Controller, Get, Query, ParseFloatPipe, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('coupons')
@UseGuards(FirebaseAuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('validate')
  async validateCoupon(
    @Query('code') code: string,
    @Query('amount', ParseFloatPipe) amount: number,
  ) {
    return this.couponsService.validateCoupon(code, amount);
  }
}
