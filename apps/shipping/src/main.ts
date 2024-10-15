import { NestFactory } from '@nestjs/core';
import { ShippingModule } from './shipping.module';
import { RmqService } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(ShippingModule);
  app.useGlobalPipes(new ValidationPipe());

  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions('SHIPPING'));
  await app.startAllMicroservices();

  const config = new DocumentBuilder()
    .setTitle('Shipping Service')
    .setDescription('The shipping service API description')
    .setVersion('1.0')
    .addTag('shipping')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const configService = app.get(ConfigService);
  await app.listen(configService.get('PORT'));
}
bootstrap();
