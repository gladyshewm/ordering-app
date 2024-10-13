import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreatedOrderDTO } from './dto/order-created.dto';
import { ProductRepository } from './product.repository';
import { ReservationRepository } from './reservation.repository';
import {
  AddProductDTO,
  ProductDTO,
  ReservationDTO,
} from './dto/add-product.dto';
import { lastValueFrom } from 'rxjs';
import { RmqService } from '@app/common';
import { ORDERS_SERVICE } from './constants/services';
import { ClientProxy, RmqContext } from '@nestjs/microservices';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly reservationRepository: ReservationRepository,
    private readonly rmqService: RmqService,
    @Inject(ORDERS_SERVICE) private readonly ordersClient: ClientProxy,
  ) {}

  async addProducts(products: AddProductDTO): Promise<ProductDTO> {
    return this.productRepository.createAndPopulate(products);
  }

  async getProducts(): Promise<ProductDTO[]> {
    return this.productRepository.findAndPopulate({});
  }

  async getReservations(): Promise<ReservationDTO[]> {
    return this.reservationRepository.find({});
  }

  async reserveItems(
    createdOrder: CreatedOrderDTO,
    context: RmqContext,
  ): Promise<void> {
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

        await this.productRepository.upsert({ _id: product._id }, product);

        await lastValueFrom(
          this.ordersClient.emit('inventory_reserved', createdOrder),
        )
          .then(() => {
            this.logger.log('Successfully emitted inventory_reserved event');
          })
          .catch((error) => {
            this.logger.error('Failed to emit inventory_reserved event', error);
          });

        this.rmqService.ack(context);
      }
    } catch (error) {
      this.logger.error(
        `Failed to reserve items for order ${createdOrder._id}`,
        error,
      );

      await lastValueFrom(
        this.ordersClient.emit('inventory_unavailable', createdOrder),
      ).catch((error) => {
        this.logger.error('Failed to emit inventory_unavailable event', error);
      });

      this.rmqService.ack(context);
    }
  }
}
