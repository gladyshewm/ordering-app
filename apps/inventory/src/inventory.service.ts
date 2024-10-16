import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreatedOrderDTO } from './dto/order-created.dto';
import { ProductRepository } from './product.repository';
import { ReservationRepository } from './reservation.repository';
import {
  AddProductDTO,
  ProductDTO,
  ReservationDTO,
} from './dto/add-product.dto';
import { RmqService } from '@app/common';
import { RmqContext } from '@nestjs/microservices';
import { Reservation } from './schemas/reservation.schema';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly reservationRepository: ReservationRepository,
    private readonly rmqService: RmqService,
    // @Inject(ORDERS_SERVICE) private readonly ordersClient: ClientProxy,
  ) {}

  private convertReservationToDTO(order: Reservation): ReservationDTO {
    return {
      _id: String(order._id),
      orderId: order.orderId,
      quantity: order.quantity,
      expiresAt: order.expiresAt,
    };
  }

  async addProducts(products: AddProductDTO): Promise<ProductDTO> {
    return this.productRepository.createAndPopulate(products);
  }

  async getProducts(): Promise<ProductDTO[]> {
    return this.productRepository.findAndPopulate({});
  }

  async getReservations(): Promise<ReservationDTO[]> {
    const reservations = await this.reservationRepository.find({});
    return reservations.map(this.convertReservationToDTO);
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
      }
    } catch (error) {
      this.logger.error(
        `Failed to reserve items for order ${createdOrder._id}`,
        error,
      );
      throw new Error('Failed to reserve items');
    } finally {
      this.rmqService.ack(context);
    }
  }
}
