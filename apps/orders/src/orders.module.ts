import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { DatabaseModule, RmqModule } from '@app/common';
import { OrdersRepository } from './orders.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import {
  BILLING_SERVICE,
  INVENTORY_SERVICE,
  ORDERS_SERVICE,
  SHIPPING_SERVICE,
} from './constants/services';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
        PORT: Joi.number().required().default(3000),
        RABBIT_MQ_URI: Joi.string().required(),
        RABBIT_MQ_ORDERS_QUEUE: Joi.string().required(),
        RABBIT_MQ_BILLING_QUEUE: Joi.string().required(),
        RABBIT_MQ_INVENTORY_QUEUE: Joi.string().required(),
        RABBIT_MQ_SHIPPING_QUEUE: Joi.string().required(),
      }),
      envFilePath: './apps/orders/.env',
    }),
    DatabaseModule,
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    RmqModule.register({ name: ORDERS_SERVICE }),
    RmqModule.register({ name: BILLING_SERVICE }),
    RmqModule.register({ name: INVENTORY_SERVICE }),
    RmqModule.register({ name: SHIPPING_SERVICE }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
