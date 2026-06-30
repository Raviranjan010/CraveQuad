import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  async createOrder(@Body('orderId') orderId: string, @Body('amount') amount: number) {
    return this.paymentsService.createRazorpayOrder(orderId, amount);
  }

  @Post('verify')
  async verifyPayment(
    @Body('razorpayOrderId') razorpayOrderId: string,
    @Body('razorpayPaymentId') razorpayPaymentId: string,
    @Body('razorpaySignature') razorpaySignature: string,
  ) {
    return this.paymentsService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  }
}
