import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersRepository } from './orders.repository';
import { INVENTORY_SERVICE } from './constants/services';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { OrderDTO, OrderStatus } from './dto/order.dto';
import { Types } from 'mongoose';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    @Inject(INVENTORY_SERVICE) private inventoryClient: ClientProxy,
  ) {}

  async createOrder(request: CreateOrderDto): Promise<OrderDTO> {
    const order = await this.ordersRepository.create(request);
    const createdOrder: OrderDTO = {
      _id: String(order._id),
      name: order.name,
      price: order.price,
      phoneNumber: order.phoneNumber,
      status: order.status,
      statusHistory: order.statusHistory,
    };

    await lastValueFrom(
      this.inventoryClient.emit('order_created', createdOrder),
    )
      .then(() => {
        this.logger.log('Successfully emitted order_created event');
      })
      .catch((error) => {
        this.logger.error('Failed to emit order_created event', error);
      });

    return createdOrder;
  }

  async getOrders(): Promise<OrderDTO[]> {
    const orders = await this.ordersRepository.find({});
    return orders.map((order) => ({
      _id: String(order._id),
      name: order.name,
      price: order.price,
      phoneNumber: order.phoneNumber,
      status: order.status,
      statusHistory: order.statusHistory,
    }));
  }

  async getOrder(id: string): Promise<OrderDTO> {
    const order = await this.ordersRepository.findOne({ _id: id });
    return {
      _id: String(order._id),
      name: order.name,
      price: order.price,
      phoneNumber: order.phoneNumber,
      status: order.status,
      statusHistory: order.statusHistory,
    };
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    comment: string = '',
  ): Promise<OrderDTO> {
    const order = await this.ordersRepository.findOne({
      _id: new Types.ObjectId(orderId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!this.isStatusTransitionAllowed(order.status, newStatus)) {
      throw new BadRequestException(
        `Status transition from ${order.status} to ${newStatus} is not allowed`,
      );
    }

    const newStatusHistory = {
      status: newStatus,
      date: new Date(),
      comment: comment,
    };
    order.status = newStatus;
    order.statusHistory.push(newStatusHistory);

    const updatedOrder = await this.ordersRepository.updateOrder(order);

    return {
      _id: String(updatedOrder._id),
      name: updatedOrder.name,
      price: updatedOrder.price,
      phoneNumber: updatedOrder.phoneNumber,
      status: updatedOrder.status,
      statusHistory: updatedOrder.statusHistory,
    } as OrderDTO;
  }

  private isStatusTransitionAllowed(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): boolean {
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.CREATED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [], // Конечный статус
      [OrderStatus.CANCELLED]: [], // Конечный статус
    };

    return allowedTransitions[currentStatus].includes(newStatus) ?? false;
  }
}
