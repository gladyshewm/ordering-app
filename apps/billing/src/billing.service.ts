import { Injectable, Logger } from '@nestjs/common';
import { ConfirmedOrderDTO } from './dto/order-confirmed.dto';

@Injectable()
export class BillingService {
  private logger = new Logger(BillingService.name);

  async bill(confirmedOrder: ConfirmedOrderDTO) {
    this.logger.log('Billing...', confirmedOrder);
  }
}
