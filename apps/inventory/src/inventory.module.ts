import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { DatabaseModule, RmqModule } from '@app/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { INVENTORY_SERVICE, ORDERS_SERVICE } from './constants/services';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductRepository } from './product.repository';
import { ReservationRepository } from './reservation.repository';
import { Reservation, ReservationSchema } from './schemas/reservation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
        RABBIT_MQ_URI: Joi.string().required(),
        RABBIT_MQ_INVENTORY_QUEUE: Joi.string().required(),
        RABBIT_MQ_ORDERS_QUEUE: Joi.string().required(),
      }),
    }),
    RmqModule.register({ name: INVENTORY_SERVICE }),
    RmqModule.register({ name: ORDERS_SERVICE }),
    DatabaseModule,
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, ProductRepository, ReservationRepository],
})
export class InventoryModule {}
