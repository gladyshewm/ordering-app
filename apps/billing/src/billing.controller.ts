import { Controller, Inject, Logger } from '@nestjs/common';
import { BillingService } from './billing.service';
import {
  ClientProxy,
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { RmqService } from '@app/common';
import { lastValueFrom } from 'rxjs';
import { ORDERS_SERVICE } from './constants/services';
import { ConfirmedOrderDTO } from './dto/order-confirmed.dto';

@Controller()
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly rmqService: RmqService,
    @Inject(ORDERS_SERVICE) private readonly ordersClient: ClientProxy,
  ) {}

  @EventPattern('order_confirmed')
  async handleOrderCreated(
    @Payload() confirmedOrder: ConfirmedOrderDTO,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(
      `Received order_confirmed event for order ${confirmedOrder._id}`,
    );
    try {
      await this.billingService.bill(confirmedOrder);

      await lastValueFrom(
        this.ordersClient.emit('payment_successful', confirmedOrder),
      )
        .then(() => {
          this.logger.log('Successfully emitted payment_successful event');
        })
        .catch((error) => {
          this.logger.error('Failed to emit payment_successful event', error);
        });

      this.rmqService.ack(context);
    } catch (error) {
      this.logger.error('Error processing order', error);

      await lastValueFrom(
        this.ordersClient.emit('payment_failed', confirmedOrder),
      ).catch((error) => {
        this.logger.error('Failed to emit payment_failed event', error);
      });

      this.rmqService.nack(context);
    }
  }
}
