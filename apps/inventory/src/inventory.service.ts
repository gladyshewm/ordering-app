import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreatedOrderDTO } from './dto/order-created.dto';
import { ProductRepository } from './product.repository';
import { ReservationRepository } from './reservation.repository';
import { AddProductDTO, ProductDTO } from './dto/add-product.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async addProducts(products: AddProductDTO): Promise<ProductDTO> {
    return this.productRepository.createAndPopulate(products);
  }

  async getProducts(): Promise<ProductDTO[]> {
    return this.productRepository.findAndPopulate({});
  }

  async reserveItems(createdOrder: CreatedOrderDTO): Promise<void> {
    this.logger.log(`Reserving items for order ${createdOrder._id}...`);
    try {
      for (const item of createdOrder.items) {
        const product = await this.productRepository.findOne({
          sku: item.sku,
        });

        if (!product) {
          throw new NotFoundException(`Product with sku ${item.sku} not found`);
        }

        if (product.quantity < item.quantity) {
          throw new Error(
            `Insufficient quantity of product with sku ${item.sku}`,
          );
        }

        if (product.reservations.length > 0) {
          this.logger.log(`Product with sku ${item.sku} is already reserved`);
          return;
        }

        const reservation = await this.reservationRepository.create({
          orderId: createdOrder._id,
          quantity: item.quantity,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        if (!reservation) {
          throw new Error('Failed to create reservation');
        }

        product.quantity -= item.quantity;
        product.reservations.push(reservation._id);
      }
    } catch (error) {
      this.logger.error(
        `Failed to reserve items for order ${createdOrder._id}`,
        error,
      );
      throw new Error('Failed to reserve items');
    }
  }
}
