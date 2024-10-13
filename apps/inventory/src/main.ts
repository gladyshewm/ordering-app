import { NestFactory } from '@nestjs/core';
import { InventoryModule } from './inventory.module';
import { RmqService } from '@app/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(InventoryModule);
  app.useGlobalPipes(new ValidationPipe());

  const rmqService = app.get<RmqService>(RmqService);
  app.connectMicroservice(rmqService.getOptions('INVENTORY'));
  await app.startAllMicroservices();

  const config = new DocumentBuilder()
    .setTitle('Inventory Service')
    .setDescription('The inventory service API description')
    .setVersion('1.0')
    .addTag('inventory')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const configService = app.get(ConfigService);
  await app.listen(configService.get('PORT'));
}
bootstrap();
