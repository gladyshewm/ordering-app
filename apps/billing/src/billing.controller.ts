import { Controller, Logger } from '@nestjs/common';
import { BillingService } from './billing.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { PaymentDTO } from './dto/payment.dto';

@Controller()
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  @EventPattern('order_confirmed')
  async handleOrderCreated(
    @Payload() paymentDetails: PaymentDTO,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(
      `Received order_confirmed event for order ${paymentDetails.orderId}`,
    );
    await this.billingService.bill(paymentDetails, context);
  }
}
