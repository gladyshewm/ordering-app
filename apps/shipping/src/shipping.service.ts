import { Injectable, Logger } from '@nestjs/common';
import { PaidOrderDTO } from './dto/order-paid.dto';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  async ship(paidOrder: PaidOrderDTO) {
    this.logger.log(`Shipping order ${paidOrder._id}`);
  }
}
