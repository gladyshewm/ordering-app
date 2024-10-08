import { Injectable, Logger } from '@nestjs/common';
import { CreatedOrderDTO } from './dto/order-created.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  async reserveItems(data: CreatedOrderDTO) {
    this.logger.log('Reserving items...', data);
  }
}
