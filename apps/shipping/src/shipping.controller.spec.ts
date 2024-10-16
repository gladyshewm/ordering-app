import { Test, TestingModule } from '@nestjs/testing';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { ShipmentDTO } from './dto/shipment.dto';
import { RmqContext } from '@nestjs/microservices';
import { PaidOrderDTO } from './dto/paid-order.dto';

jest.mock('./shipping.service');

describe('ShippingController', () => {
  let shippingController: ShippingController;
  let shippingService: jest.Mocked<ShippingService>;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ShippingController],
      providers: [ShippingService],
    }).compile();

    shippingController = app.get<ShippingController>(ShippingController);
    shippingService = app.get<jest.Mocked<ShippingService>>(ShippingService);
  });

  describe('root', () => {
    it('should be defined', () => {
      expect(shippingController).toBeDefined();
    });
  });

  describe('getShipments', () => {
    let result: ShipmentDTO[];
    const shipments: ShipmentDTO[] = [
      {
        _id: '1',
        orderId: '1',
        address: '123 Main St',
        trackingNumber: 'TN123456789',
        estimatedDeliveryDate: new Date(),
        actualDeliveryDate: new Date(),
      },
    ];

    beforeEach(async () => {
      shippingService.getShipments.mockResolvedValue(shipments);
      result = await shippingController.getShipments();
    });

    it('should call shippingService.getShipments', async () => {
      expect(shippingService.getShipments).toHaveBeenCalled();
      expect(shippingService.getShipments).toHaveBeenCalledTimes(1);
    });

    it('should return an array of shipments', () => {
      expect(result).toEqual(shipments);
    });

    it('should propagate error if shippingService throws an error', () => {
      shippingService.getShipments.mockRejectedValue(new Error('error'));
      expect(shippingController.getShipments()).rejects.toThrow(Error);
    });
  });

  describe('events', () => {
    const context = {} as RmqContext;

    describe('handleOrderPaid', () => {
      const order: PaidOrderDTO = {
        orderId: '1',
        address: '123 Main St',
      };

      beforeEach(async () => {
        shippingService.ship.mockResolvedValue();
        await shippingController.handleOrderPaid(order, context);
      });

      it('should call shippingService.ship', async () => {
        expect(shippingService.ship).toHaveBeenCalled();
        expect(shippingService.ship).toHaveBeenCalledTimes(1);
      });

      it('should propagate error if shippingService throws an error', () => {
        shippingService.ship.mockRejectedValue(new Error('error'));
        expect(
          shippingController.handleOrderPaid(order, context),
        ).rejects.toThrow(Error);
      });
    });
  });
});
