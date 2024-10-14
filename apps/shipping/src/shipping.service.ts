import { Injectable, Logger } from '@nestjs/common';
import { PaidOrderDTO } from './dto/order-paid.dto';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  async ship(orderId: string) {
    this.logger.log(`Shipping order ${orderId}`);
  }
}
