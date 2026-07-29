import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(FirebaseAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Req() req: any, @Body() body: any) {
    return this.ordersService.createOrder(req.user.id, body);
  }

  @Get()
  async getMyOrders(@Req() req: any) {
    return this.ordersService.findByUser(req.user.id);
  }

  @Get('vendor/active')
  async getActiveVendorOrders(@Req() req: any) {
    if (req.user.role !== 'VENDOR') {
      throw new ForbiddenException('Only vendors can access active orders.');
    }
    return this.ordersService.findActiveVendorOrders(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Req() req: any,
  ) {
    return this.ordersService.updateStatus(id, status, req.user.role, req.user.id);
  }
}
