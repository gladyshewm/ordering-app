import { Controller, Get, Logger } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { PaidOrderDTO } from './dto/paid-order.dto';
import { ShipmentDTO } from './dto/shipment.dto';

@Controller('shipments')
export class ShippingController {
  private readonly logger = new Logger(ShippingController.name);

  constructor(private readonly shippingService: ShippingService) {}

  @Get()
  async getShipments(): Promise<ShipmentDTO[]> {
    return this.shippingService.getShipments();
  }

  @EventPattern('order_paid')
  async handleOrderPaid(
    @Payload() order: PaidOrderDTO,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received order_paid event for order ${order.orderId}`);
    await this.shippingService.ship(order, context);
  }
}
