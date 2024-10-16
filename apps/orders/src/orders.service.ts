import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import {
  BILLING_SERVICE,
  INVENTORY_SERVICE,
  SHIPPING_SERVICE,
} from './constants/services';
import { ClientProxy, RmqContext } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import {
  CreatedOrderDTO,
  CreateOrderDTO,
  OrderDTO,
  OrderStatus,
} from './dto/order.dto';
import { Types } from 'mongoose';
import { RmqService } from '@app/common';
import { PaymentDTO } from './dto/payment.dto';
import { OrderToShipDTO } from './dto/ship-order.dto';
import { Order } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly rmqService: RmqService,
    @Inject(INVENTORY_SERVICE) private inventoryClient: ClientProxy,
    @Inject(BILLING_SERVICE) private billingClient: ClientProxy,
    @Inject(SHIPPING_SERVICE) private shippingClient: ClientProxy,
  ) {}

  private convertOrderToDTO(order: Order): OrderDTO {
    return {
      _id: String(order._id),
      items: order.items,
      address: order.address,
      phoneNumber: order.phoneNumber,
      totalPrice: order.totalPrice,
      status: order.status,
      statusHistory: order.statusHistory,
    };
  }

  async createOrder(request: CreateOrderDTO): Promise<CreatedOrderDTO> {
    try {
      const totalPrice = request.items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      );
      const order = this.convertOrderToDTO(
        await this.ordersRepository.create({
          ...request,
          totalPrice,
        }),
      );

      const createdOrder: CreatedOrderDTO = {
        _id: order._id,
        items: order.items,
        address: order.address,
        phoneNumber: order.phoneNumber,
        totalPrice: order.totalPrice,
      };

      try {
        const inventoryResponse: { success: boolean } =
          await this.reserveInventory(createdOrder);

        if (inventoryResponse.success) {
          this.logger.log('Inventory reserved successfully');
          await this.updateOrderStatus(createdOrder._id, OrderStatus.CONFIRMED);
          const paymentDetails: PaymentDTO = {
            orderId: createdOrder._id,
            totalPrice: createdOrder.totalPrice,
            phoneNumber: createdOrder.phoneNumber,
          };
          await this.processPayment(paymentDetails);
        } else {
          this.logger.error('Failed to reserve items');
          await this.updateOrderStatus(createdOrder._id, OrderStatus.CANCELLED);
        }
      } catch (error) {
        this.logger.error('Error during order processing', error);
        throw new BadRequestException(error);
      }

      return createdOrder;
    } catch (error) {
      this.logger.error('Failed to create order', error);
      throw new BadRequestException(error);
    }
  }

  async reserveInventory(
    order: CreatedOrderDTO,
  ): Promise<{ success: boolean }> {
    try {
      const response = await lastValueFrom(
        this.inventoryClient.send('order_created', order),
      );
      return response;
    } catch (error) {
      this.logger.error('Failed to reserve inventory', error);
      return { success: false };
    }
  }

  async processPayment(paymentDetails: PaymentDTO): Promise<void> {
    try {
      await lastValueFrom(
        this.billingClient.emit('order_confirmed', paymentDetails),
      );
      this.logger.log(
        `Successfully emitted order_confirmed event for order ${paymentDetails.orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit order_confirmed event for order ${paymentDetails.orderId}`,
        error,
      );
      throw new Error('Failed to process payment');
    }
  }

  async getOrders(): Promise<OrderDTO[]> {
    try {
      const orders = await this.ordersRepository.find({});

      if (!orders) {
        throw new NotFoundException('Orders not found');
      }

      return orders.map((order) => this.convertOrderToDTO(order));
    } catch (error) {
      this.logger.error('Failed to get orders', error);
      throw new Error('Failed to get orders');
    }
  }

  async getOrder(id: string): Promise<OrderDTO> {
    try {
      const order = await this.ordersRepository.findOne({ _id: id });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      return this.convertOrderToDTO(order);
    } catch (error) {
      this.logger.error(`Failed to get order ${id}`, error);
      throw new Error('Failed to get order');
    }
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    comment: string = '',
  ): Promise<OrderDTO> {
    try {
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
        comment: comment
          ? comment
          : `Status changed from ${order.status} to ${newStatus}`,
      };
      order.status = newStatus;
      order.statusHistory.push(newStatusHistory);

      const updatedOrder = await this.ordersRepository.updateOrder(order);

      this.logger.log(
        `Successfully updated order ${orderId} status to ${newStatus}`,
      );

      return this.convertOrderToDTO(updatedOrder);
    } catch (error) {
      this.logger.error('Failed to update order status', error);
      throw new Error('Failed to update order status');
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

  async handleInventoryUnavailable(
    orderId: string,
    context: RmqContext,
  ): Promise<void> {
    try {
      await this.updateOrderStatus(orderId, OrderStatus.CANCELLED);
    } catch (error) {
      this.logger.error(`Failed to update order ${orderId} status`, error);
    } finally {
      this.rmqService.ack(context);
    }
  }

  async handlePaymentSuccessful(
    orderId: string,
    context: RmqContext,
  ): Promise<void> {
    try {
      await this.updateOrderStatus(orderId, OrderStatus.PAID);
      await this.deliverTheOrder(orderId);
    } catch (error) {
      this.logger.error(`Failed to update order ${orderId} status`, error);
    } finally {
      this.rmqService.ack(context);
    }
  }

  async deliverTheOrder(orderId: string): Promise<void> {
    try {
      const order = await this.ordersRepository.findOne(
        {
          _id: orderId,
        },
        {
          orderId: 1,
          address: 1,
        },
      );

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const orderToShip: OrderToShipDTO = {
        orderId: String(order._id),
        address: order.address,
      };

      await lastValueFrom(this.shippingClient.emit('order_paid', orderToShip));
      this.logger.log(
        `Successfully emitted order_paid event for order ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit order_paid event for order ${orderId}`,
        error,
      );
      throw new Error('Failed to deliver the order');
    }
  }

  async handleShippingProcessing(
    orderId: string,
    context: RmqContext,
  ): Promise<void> {
    try {
      await this.updateOrderStatus(orderId, OrderStatus.PROCESSING);
    } catch (error) {
      this.logger.error(`Failed to update order ${orderId} status`, error);
    } finally {
      this.rmqService.ack(context);
    }
  }

  async handleOrderShipped(
    orderId: string,
    context: RmqContext,
  ): Promise<void> {
    try {
      await this.updateOrderStatus(orderId, OrderStatus.SHIPPED);
    } catch (error) {
      this.logger.error(`Failed to update order ${orderId} status`, error);
    } finally {
      this.rmqService.ack(context);
    }
  }

  async handleOrderDelivered(
    orderId: string,
    context: RmqContext,
  ): Promise<void> {
    try {
      await this.updateOrderStatus(orderId, OrderStatus.DELIVERED);
    } catch (error) {
      this.logger.error(`Failed to update order ${orderId} status`, error);
    } finally {
      this.rmqService.ack(context);
    }
  }
}
