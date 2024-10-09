import { NestFactory } from '@nestjs/core';
import { ShippingModule } from './shipping.module';
import { RmqService } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(ShippingModule);
  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions('SHIPPING'));
  await app.startAllMicroservices();
}
bootstrap();
