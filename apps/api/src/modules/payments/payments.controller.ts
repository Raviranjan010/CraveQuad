import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { Public } from '../auth/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @UseGuards(FirebaseAuthGuard)
  async createOrder(@Body('orderId') orderId: string, @Body('amount') amount: number) {
    return this.paymentsService.createRazorpayOrder(orderId, amount);
  }

  @Post('verify')
  @UseGuards(FirebaseAuthGuard)
  async verifyPayment(
    @Body('razorpayOrderId') razorpayOrderId: string,
    @Body('razorpayPaymentId') razorpayPaymentId: string,
    @Body('razorpaySignature') razorpaySignature: string,
  ) {
    return this.paymentsService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  }

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(body, signature);
  }
}
