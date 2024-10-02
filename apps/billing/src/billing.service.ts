import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BillingService {
  private logger = new Logger(BillingService.name);

  bill(data: any) {
    this.logger.log('Billing...', data);
  }
}
