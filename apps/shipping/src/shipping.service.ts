import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { RmqService } from '@app/common';
import { ORDERS_SERVICE } from './constants/services';
import { ClientProxy, RmqContext } from '@nestjs/microservices';
import { PaidOrderDTO } from './dto/paid-order.dto';
import { ShippingRepository } from './shipping.repository';
import { ShipmentDTO } from './dto/shipment.dto';
import { Shipment } from './schemas/shipment.schema';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private readonly shippingRepository: ShippingRepository,
    private readonly rmqService: RmqService,
    @Inject(ORDERS_SERVICE) private readonly ordersClient: ClientProxy,
  ) {}

  private convertShipmentToDTO(shipment: Shipment): ShipmentDTO {
    return {
      _id: String(shipment._id),
      orderId: shipment.orderId,
      address: shipment.address,
      trackingNumber: shipment.trackingNumber,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate,
      actualDeliveryDate: shipment.actualDeliveryDate,
    };
  }

  async getShipments(): Promise<ShipmentDTO[]> {
    try {
      const shipments = await this.shippingRepository.find({});
      return shipments.map((shipment) => this.convertShipmentToDTO(shipment));
    } catch (error) {
      this.logger.error('Failed to get shipments', error);
      throw new Error('Failed to get shipments');
    }
  }

  async ship(order: PaidOrderDTO, context: RmqContext) {
    this.logger.log(`Shipping order ${order.orderId}...`);
    try {
      await this.processShipping(order.orderId);

      const shipment = await this.shippingRepository.create({
        orderId: order.orderId,
        address: order.address,
      });

      if (!shipment) {
        throw new Error('Failed to create shipment');
      }

      // Имитация подготовки заказа
      await new Promise((resolve) => setTimeout(resolve, 2000));

      shipment.trackingNumber = this.generateTrackingNumber();
      shipment.estimatedDeliveryDate = this.calculateEstimatedDeliveryDate();
      // await shipment.save();
      await this.shippingRepository.upsert(
        { orderId: shipment.orderId },
        shipment,
      );

      await this.shipped(order.orderId);

      await this.deliver(shipment.trackingNumber);
    } catch (error) {
      this.logger.error('Error processing order', error);
      await this.cancelShipping(order.orderId);
    } finally {
      this.rmqService.ack(context);
    }
  }

  private generateTrackingNumber(): string {
    return `TN${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  private calculateEstimatedDeliveryDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 3); // Предполагаем доставку через 3 дня
    return date;
  }

  async processShipping(orderId: string): Promise<void> {
    try {
      await lastValueFrom(
        this.ordersClient.emit('shipping_processing', orderId),
      );
      this.logger.log('Successfully emitted shipping_processing event');
    } catch (error) {
      this.logger.error('Failed to emit shipping_processing event', error);
      throw new Error('Failed to process shipping');
    }
  }

  async shipped(orderId: string): Promise<void> {
    try {
      await lastValueFrom(this.ordersClient.emit('order_shipped', orderId));
      this.logger.log('Successfully emitted order_shipped event');
    } catch (error) {
      this.logger.error('Failed to emit order_shipped event', error);
      throw new Error('Failed to ship order');
    }
  }

  async deliver(trackingNumber: string): Promise<void> {
    try {
      const shipment = await this.shippingRepository.findOne({
        trackingNumber,
      });

      if (!shipment) {
        throw new NotFoundException(
          `Shipment with tracking number ${trackingNumber} not found`,
        );
      }

      shipment.actualDeliveryDate = new Date();
      await shipment.save();

      await lastValueFrom(
        this.ordersClient.emit('order_delivered', shipment.orderId),
      );
    } catch (error) {
      this.logger.error('Failed to deliver shipment', error);
      throw new Error('Failed to deliver shipment');
    }
  }

  async cancelShipping(orderId: string): Promise<void> {
    try {
      await lastValueFrom(this.ordersClient.emit('shipping_failed', orderId));
      this.logger.log('Successfully emitted shipping_failed event');
    } catch (error) {
      this.logger.error('Failed to emit shipping_failed event', error);
      throw new Error('Failed to cancel shipping');
    }
  }
}
