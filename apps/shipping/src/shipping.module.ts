import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { RmqModule } from '@app/common';
import { ORDERS_SERVICE, SHIPPING_SERVICE } from './constants/services';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        RABBIT_MQ_URI: Joi.string().required(),
        RABBIT_MQ_ORDERS_QUEUE: Joi.string().required(),
        RABBIT_MQ_SHIPPING_QUEUE: Joi.string().required(),
      }),
    }),
    RmqModule.register({ name: SHIPPING_SERVICE }),
    RmqModule.register({ name: ORDERS_SERVICE }),
  ],
  controllers: [ShippingController],
  providers: [ShippingService],
})
export class ShippingModule {}
