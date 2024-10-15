import { Controller, Get, Logger, Param } from '@nestjs/common';
import { BillingService } from './billing.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { PaymentDTO } from './dto/payment.dto';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BillingDTO } from './dto/billing.dto';

@Controller('billing')
@ApiTags('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  @Get()
  @ApiOkResponse({ type: [BillingDTO], description: 'Get all payments' })
  async getPayments(): Promise<BillingDTO[]> {
    return this.billingService.getPayments();
  }

  @Get(':orderId')
  @ApiOkResponse({
    type: [BillingDTO],
    description: 'Get all payments by orderId',
  })
  async getPaymentsByOrderId(
    @Param('orderId') orderId: string,
  ): Promise<BillingDTO[]> {
    return this.billingService.getPaymentsByOrderId(orderId);
  }

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
