import { Controller, Inject, Logger } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { RmqService } from '@app/common';
import {
  ClientProxy,
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { ORDERS_SERVICE } from './constants/services';
import { lastValueFrom } from 'rxjs';
import { CreatedOrderDTO } from './dto/order-created.dto';

@Controller()
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly rmqService: RmqService,
    @Inject(ORDERS_SERVICE) private readonly ordersClient: ClientProxy,
  ) {}

  @EventPattern('order_created')
  async handleOrderCreated(
    @Payload() createdOrder: CreatedOrderDTO,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log('Received order_created event');

    try {
      await this.inventoryService.reserveItems(createdOrder);

      await lastValueFrom(
        this.ordersClient.emit('inventory_reserved', createdOrder),
      )
        .then(() => {
          this.logger.log('Successfully emitted inventory_reserved event');
        })
        .catch((error) => {
          this.logger.error('Failed to emit inventory_reserved event', error);
        });

      this.rmqService.ack(context);
    } catch (error) {
      this.logger.error('Error processing order', error);

      await lastValueFrom(
        this.ordersClient.emit('inventory_unavailable', createdOrder),
      ).catch((error) => {
        this.logger.error('Failed to emit inventory_unavailable event', error);
      });

      this.rmqService.nack(context);
    }
  }
}
