import { Controller, Get, Post, Delete, Body, Req, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('cart')
@UseGuards(FirebaseAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: any) {
    return this.cartService.getCart(req.user.id);
  }

  @Post()
  async updateCart(
    @Req() req: any,
    @Body('vendorId') vendorId: string,
    @Body('items') items: { id: string; quantity: number }[],
  ) {
    return this.cartService.updateCart(req.user.id, vendorId, items);
  }

  @Delete()
  async clearCart(@Req() req: any) {
    return this.cartService.clearCart(req.user.id);
  }
}
