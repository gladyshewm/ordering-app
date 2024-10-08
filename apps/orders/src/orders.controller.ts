import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { StatusHistory } from './schemas/order.schema';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderDTO, OrderStatus } from './dto/order.dto';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RmqService } from '@app/common';

@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly rmqService: RmqService,
  ) {}

  @Post()
  async createOrder(@Body() request: CreateOrderDto): Promise<OrderDTO> {
    return this.ordersService.createOrder(request);
  }

  @Get()
  async getOrders(): Promise<OrderDTO[]> {
    return this.ordersService.getOrders();
  }

  @Get(':id')
  async getOrder(@Param('id') id: string): Promise<OrderDTO> {
    return this.ordersService.getOrder(id);
  }

  @Put(':id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderDTO> {
    return this.ordersService.updateOrderStatus(
      id,
      updateStatusDto.status,
      updateStatusDto.comment,
    );
  }

  @Get(':id/history')
  async getOrderStatusHistory(
    @Param('id') id: string,
  ): Promise<StatusHistory[]> {
    const order = await this.ordersService.getOrder(id);
    return order.statusHistory;
  }

  @EventPattern('inventory_reserved')
  async handleInventoryReserved(
    @Payload() data: OrderDTO,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received inventory_reserved event for order ${data._id}`);
    try {
      await this.ordersService.updateOrderStatus(
        data._id,
        OrderStatus.CONFIRMED,
      );

      this.logger.log(
        `Successfully updated order ${data._id} status to CONFIRMED`,
      );

      this.rmqService.ack(context);
    } catch (error) {
      this.logger.error(`Failed to update order ${data._id} status`, error);
      this.rmqService.nack(context);
    }
  }
}
