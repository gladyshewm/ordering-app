import { Controller, Inject, Logger } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import {
  ClientProxy,
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { PaidOrderDTO } from './dto/order-paid.dto';
import { lastValueFrom } from 'rxjs';
import { ORDERS_SERVICE } from './constants/services';
import { RmqService } from '@app/common';

@Controller()
export class ShippingController {
  private readonly logger = new Logger(ShippingController.name);

  constructor(
    private readonly shippingService: ShippingService,
    private readonly rmqService: RmqService,
    @Inject(ORDERS_SERVICE) private readonly ordersClient: ClientProxy,
  ) {}

  @EventPattern('order_paid')
  async handleOrderPaid(
    @Payload() orderId: string,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received order_paid event for order ${orderId}`);
    try {
      await this.shippingService.ship(orderId);

      await lastValueFrom(
        this.ordersClient.emit('shipping_processing', orderId),
      )
        .then(() => {
          this.logger.log('Successfully emitted shipping_processing event');
        })
        .catch((error) => {
          this.logger.error('Failed to emit shipping_processing event', error);
        });

      this.rmqService.ack(context);
    } catch (error) {
      this.logger.error('Error processing order', error);

      await lastValueFrom(
        this.ordersClient.emit('shipping_failed', orderId),
      ).catch((error) => {
        this.logger.error('Failed to emit shipping_failed event', error);
      });

      this.rmqService.nack(context);
    }
  }
}
