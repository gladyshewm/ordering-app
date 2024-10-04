import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersRepository } from './orders.repository';
import { BILLING_SERVICE } from './constants/services';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Order, OrderStatus } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    @Inject(BILLING_SERVICE) private billingClient: ClientProxy,
  ) {}

  async createOrder(request: CreateOrderDto): Promise<Order> {
    const session = await this.ordersRepository.startTransaction();

    try {
      const order = await this.ordersRepository.create(request, { session });
      await lastValueFrom(
        this.billingClient.emit('order_created', { request }),
      );
      await session.commitTransaction();

      return order;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    }
  }

  async getOrders(): Promise<Order[]> {
    return this.ordersRepository.find({});
  }

  async getOrder(id: string): Promise<Order> {
    return this.ordersRepository.findOne({ _id: id });
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    comment?: string,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOne({ _id: orderId });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!this.isStatusTransitionAllowed(order.status, newStatus)) {
      throw new BadRequestException(
        `Status transition from ${order.status} to ${newStatus} is not allowed`,
      );
    }

    const session = await this.ordersRepository.startTransaction();

    try {
      const newStatusHistory = {
        status: newStatus,
        date: new Date(),
        comment: comment || '',
      };
      order.status = newStatus;
      order.statusHistory.push(newStatusHistory);

      const updatedOrder = await this.ordersRepository.updateOrder(
        order,
        session,
      );

      // await lastValueFrom(
      //   this.billingClient.emit('order_status_changed', {
      //     orderId: order._id,
      //     oldStatus: order.status,
      //     newStatus: newStatus,
      //     comment,
      //   }),
      // );
      await session.commitTransaction();

      return updatedOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    }
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
