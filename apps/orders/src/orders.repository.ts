import { Injectable, Logger } from '@nestjs/common';
import { AbstractRepository } from '@app/common';
import { Order } from './schemas/order.schema';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';

@Injectable()
export class OrdersRepository extends AbstractRepository<Order> {
  private readonly logger = new Logger(OrdersRepository.name);

  constructor(
    @InjectModel(Order.name) orderModel: Model<Order>,
    // @InjectConnection() connection: Connection,
  ) {
    super(orderModel);
  }

  async updateOrder(order: Order, session?: ClientSession): Promise<Order> {
    return order.save({ session });
  }
}
