import { NestFactory } from '@nestjs/core';
import { InventoryModule } from './inventory.module';
import { RmqService } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(InventoryModule);
  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions('INVENTORY'));
  await app.startAllMicroservices();
}
bootstrap();
