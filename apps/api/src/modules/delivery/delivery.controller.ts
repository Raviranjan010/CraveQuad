import { Controller, Get, Param } from '@nestjs/common';
import { DeliveryService } from './delivery.service';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get(':partnerId/active')
  async getActive(@Param('partnerId') partnerId: string) {
    return this.deliveryService.getActiveDeliveries(partnerId);
  }
}
