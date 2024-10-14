import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { CreatedOrderDTO } from './dto/order-created.dto';
import {
  AddProductDTO,
  ProductDTO,
  ReservationDTO,
} from './dto/add-product.dto';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiProductResponse } from './decorators/swagger/api-product.decorator';

@Controller('inventory')
@ApiTags('inventory')
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiProductResponse(ReservationDTO, 'Get all products from inventory')
  async getProducts(): Promise<ProductDTO[]> {
    return this.inventoryService.getProducts();
  }

  @Post()
  @ApiProductResponse(ReservationDTO, 'Add product to inventory')
  @ApiBody({ type: AddProductDTO })
  async addProducts(@Body() product: AddProductDTO): Promise<ProductDTO> {
    return this.inventoryService.addProducts(product);
  }

  @Get('/reservations')
  @ApiOkResponse({
    type: [ReservationDTO],
    description: 'Get all reservations',
  })
  async getReservations(): Promise<ReservationDTO[]> {
    return this.inventoryService.getReservations();
  }

  @MessagePattern('order_created')
  async handleOrderCreated(
    @Payload() createdOrder: CreatedOrderDTO,
    @Ctx() context: RmqContext,
  ) {
    try {
      await this.inventoryService.reserveItems(createdOrder, context);
      this.logger.log(
        `Items successfully reserved for order ${createdOrder._id}`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to reserve items for order ${createdOrder._id}`,
        error,
      );
      return { success: false };
    }
  }
}
