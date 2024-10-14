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
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  CreatedOrderDTO,
  CreateOrderDTO,
  OrderDTO,
  OrderStatus,
  StatusHistoryDTO,
} from './dto/order.dto';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiOrderResponse } from './decorators/swagger/api-order.decorator';
import { ApiCreatedOrderResponse } from './decorators/swagger/api-created-order.decorator';

@Controller('orders')
@ApiTags('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiCreatedOrderResponse('Create an order')
  @ApiBody({ type: CreateOrderDTO })
  async createOrder(@Body() order: CreateOrderDTO): Promise<CreatedOrderDTO> {
    return this.ordersService.createOrder(order);
  }

  @Get()
  @ApiOrderResponse('Get all orders', true)
  async getOrders(): Promise<OrderDTO[]> {
    return this.ordersService.getOrders();
  }

  @Get(':id')
  @ApiOrderResponse('Get an order')
  async getOrder(@Param('id') id: string): Promise<OrderDTO> {
    return this.ordersService.getOrder(id);
  }

  @Put(':id/status')
  @ApiOrderResponse('Update an order status')
  @ApiBody({ type: UpdateOrderStatusDto })
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
  @ApiOkResponse({ type: [StatusHistoryDTO], description: 'Get order history' })
  async getOrderStatusHistory(
    @Param('id') id: string,
  ): Promise<StatusHistoryDTO[]> {
    const order = await this.ordersService.getOrder(id);
    return order.statusHistory;
  }

  @EventPattern('inventory_unavailable')
  async handleInventoryUnavailable(
    @Payload() createdOrder: CreatedOrderDTO,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(
      `Received inventory_unavailable event for order ${createdOrder._id}`,
    );
    await this.ordersService.handleInventoryUnavailable(
      createdOrder._id,
      OrderStatus.CANCELLED,
      context,
    );
  }

  @EventPattern('payment_successful')
  async handlePaymentSuccessful(
    @Payload() order: OrderDTO,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received payment_successful event for order ${order._id}`);
    await this.ordersService.handlePaymentSuccessful(
      order._id,
      OrderStatus.PAID,
      context,
    );
  }

  @EventPattern('shipping_processing')
  async handleShippingProcessing(
    @Payload() orderId: string,
    @Ctx() context: RmqContext,
  ) {
    this.logger.log(`Received shipping_processing event for order ${orderId}`);
    await this.ordersService.handleShippingProcessing(
      orderId,
      OrderStatus.PROCESSING,
      context,
    );
  }
}
