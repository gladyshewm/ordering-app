import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { DatabaseModule, RmqModule } from '@app/common';
import { ORDERS_SERVICE, SHIPPING_SERVICE } from './constants/services';
import { MongooseModule } from '@nestjs/mongoose';
import { Shipment, ShipmentSchema } from './schemas/shipment.schema';
import { ShippingRepository } from './shipping.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
        RABBIT_MQ_URI: Joi.string().required(),
        RABBIT_MQ_ORDERS_QUEUE: Joi.string().required(),
        RABBIT_MQ_SHIPPING_QUEUE: Joi.string().required(),
      }),
    }),
    RmqModule.register({ name: SHIPPING_SERVICE }),
    RmqModule.register({ name: ORDERS_SERVICE }),
    DatabaseModule,
    MongooseModule.forFeature([
      { name: Shipment.name, schema: ShipmentSchema },
    ]),
  ],
  controllers: [ShippingController],
  providers: [ShippingService, ShippingRepository],
})
export class ShippingModule {}
