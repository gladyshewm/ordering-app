import { NestFactory } from '@nestjs/core';
import { ShippingModule } from './shipping.module';
import { RmqService } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(ShippingModule);
  app.useGlobalPipes(new ValidationPipe());

  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions('SHIPPING'));
  await app.startAllMicroservices();

  const configService = app.get(ConfigService);
  await app.listen(configService.get('PORT'));
}
bootstrap();
