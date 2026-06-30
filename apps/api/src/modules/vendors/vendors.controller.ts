import { Controller, Get, Param } from '@nestjs/common';
import { VendorsService } from './vendors.service';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get(':id/dashboard')
  async getDashboard(@Param('id') id: string) {
    return this.vendorsService.getDashboard(id);
  }
}
