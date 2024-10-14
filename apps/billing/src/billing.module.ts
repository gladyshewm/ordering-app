import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { DatabaseModule, RmqModule } from '@app/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { BILLING_SERVICE, ORDERS_SERVICE } from './constants/services';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { BillingRepository } from './billing.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
        RABBIT_MQ_URI: Joi.string().required(),
        RABBIT_MQ_ORDERS_QUEUE: Joi.string().required(),
        RABBIT_MQ_BILLING_QUEUE: Joi.string().required(),
      }),
    }),
    RmqModule.register({ name: BILLING_SERVICE }),
    RmqModule.register({ name: ORDERS_SERVICE }),
    DatabaseModule,
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
  ],
  controllers: [BillingController],
  providers: [BillingService, BillingRepository],
})
export class BillingModule {}
