import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { RmqModule } from '@app/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { ORDERS_SERVICE } from './constants/services';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        RABBIT_MQ_URI: Joi.string().required(),
        RABBIT_MQ_INVENTORY_QUEUE: Joi.string().required(),
        RABBIT_MQ_ORDERS_QUEUE: Joi.string().required(),
      }),
    }),
    RmqModule,
    RmqModule.register({ name: ORDERS_SERVICE }),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
