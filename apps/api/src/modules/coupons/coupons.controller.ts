import { Controller, Get, Query, ParseFloatPipe } from '@nestjs/common';
import { CouponsService } from './coupons.service';

@Controller('coupons')
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
