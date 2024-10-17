import { RmqService } from '@app/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ShippingService } from './shipping.service';
import { ShippingRepository } from './shipping.repository';
import { of } from 'rxjs';
import { ClientProxy, RmqContext } from '@nestjs/microservices';
import { ORDERS_SERVICE } from './constants/services';
import { ShipmentDTO } from './dto/shipment.dto';
import { Shipment } from './schemas/shipment.schema';
import { Types } from 'mongoose';
import { PaidOrderDTO } from './dto/paid-order.dto';

jest.mock('./shipping.repository');

describe('ShippingService', () => {
  let shippingService: ShippingService;
  let shippingRepository: jest.Mocked<ShippingRepository>;
  let rmqService: jest.Mocked<RmqService>;
  const ordersClientMock: jest.Mocked<ClientProxy> = {
    send: jest.fn().mockReturnValue(of({})),
    emit: jest.fn().mockReturnValue(of({})),
  } as any;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        ShippingRepository,
        {
          provide: RmqService,
          useValue: {
            ack: jest.fn(),
          },
        },
        {
          provide: ORDERS_SERVICE,
          useValue: ordersClientMock,
        },
      ],
    }).compile();

    shippingService = app.get<ShippingService>(ShippingService);
    shippingRepository =
      app.get<jest.Mocked<ShippingRepository>>(ShippingRepository);
    rmqService = app.get<jest.Mocked<RmqService>>(RmqService);
  });

  it('should be defined', () => {
    expect(shippingService).toBeDefined();
  });

  describe('getShipments', () => {
    let result: ShipmentDTO[];
    const shipments: ShipmentDTO[] = [
      {
        _id: '670e24737aa19da9ddf1823d',
        orderId: '670b3b295af38bc7d1f020c1',
        address: '123 Main St',
        trackingNumber: 'TN123456789',
        estimatedDeliveryDate: new Date('2022-01-01'),
        actualDeliveryDate: new Date('2022-01-03'),
      },
    ];
    const ships = [
      {
        _id: new Types.ObjectId('670e24737aa19da9ddf1823d'),
        orderId: '670b3b295af38bc7d1f020c1',
        address: '123 Main St',
        trackingNumber: 'TN123456789',
        estimatedDeliveryDate: new Date('2022-01-01'),
        actualDeliveryDate: new Date('2022-01-03'),
      },
    ] as Shipment[];

    beforeEach(async () => {
      shippingRepository.find.mockResolvedValue(ships);
      result = await shippingService.getShipments();
    });

    it('should call shippingRepository.find', async () => {
      expect(shippingRepository.find).toHaveBeenCalled();
      expect(shippingRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return shipments', () => {
      expect(result).toEqual(shipments);
    });

    it('should propagate error if shippingRepository throws an error', () => {
      shippingRepository.find.mockRejectedValue(new Error('error'));
      expect(shippingService.getShipments()).rejects.toThrow(Error);
    });
  });

  describe('processShipping', () => {
    const orderId = '5f8f9c0f9f9f9f9f9f9f9f9q';

    beforeEach(async () => {
      await shippingService.processShipping(orderId);
    });

    it('should emit shipping_processing event', async () => {
      expect(ordersClientMock.emit).toHaveBeenCalledWith(
        'shipping_processing',
        orderId,
      );
    });

    it('should propagate error if ordersClient throws an error', async () => {
      ordersClientMock.emit.mockImplementationOnce(() => {
        throw new Error();
      });
      await expect(shippingService.processShipping(orderId)).rejects.toThrow(
        Error,
      );
    });
  });

  describe('shipped', () => {
    const orderId = '5f8f9c0f9f9f9f9f9f9f9f9q';

    beforeEach(async () => {
      await shippingService.shipped(orderId);
    });

    it('should emit order_shipped event', async () => {
      expect(ordersClientMock.emit).toHaveBeenCalledWith(
        'order_shipped',
        orderId,
      );
    });

    it('should propagate error if ordersClient throws an error', async () => {
      ordersClientMock.emit.mockImplementationOnce(() => {
        throw new Error();
      });
      await expect(shippingService.shipped(orderId)).rejects.toThrow(Error);
    });
  });

  describe('deliver', () => {
    const trackingNumber = 'TN123456789';
    let shipment: Shipment;

    beforeEach(async () => {
      shipment = {
        _id: new Types.ObjectId('670e24737aa19da9ddf1823d'),
        orderId: '670b3b295af38bc7d1f020c1',
        address: '123 Main St',
        trackingNumber,
        estimatedDeliveryDate: new Date('2022-01-01'),
        actualDeliveryDate: null,
        save: jest.fn(),
      } as unknown as Shipment;
      shippingRepository.findOne.mockResolvedValue(shipment);
      await shippingService.deliver(trackingNumber);
    });

    it('should call shippingRepository.findOne', async () => {
      expect(shippingRepository.findOne).toHaveBeenCalledWith({
        trackingNumber,
      });
      expect(shippingRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw error if shipment not found', async () => {
      shippingRepository.findOne.mockResolvedValueOnce(null);
      await expect(shippingService.deliver(trackingNumber)).rejects.toThrow(
        Error,
      );
    });

    it('should call shipment.save', async () => {
      expect(shipment.save).toHaveBeenCalledTimes(1);
    });

    it('should emit order_delivered event', async () => {
      expect(ordersClientMock.emit).toHaveBeenCalledWith(
        'order_delivered',
        shipment.orderId,
      );
    });
  });

  describe('cancelShipping', () => {
    const orderId = '5f8f9c0f9f9f9f9f9f9f9f9q';

    beforeEach(async () => {
      await shippingService.cancelShipping(orderId);
    });

    it('should emit shipping_failed event', async () => {
      expect(ordersClientMock.emit).toHaveBeenCalledWith(
        'shipping_failed',
        orderId,
      );
    });

    it('should propagate error if ordersClient throws an error', async () => {
      ordersClientMock.emit.mockImplementationOnce(() => {
        throw new Error();
      });
      await expect(shippingService.cancelShipping(orderId)).rejects.toThrow(
        Error,
      );
    });
  });

  describe('ship', () => {
    const order: PaidOrderDTO = {
      orderId: '670b3b295af38bc7d1f020c1',
      address: '123 Main St',
    };
    const context = {} as RmqContext;
    let shipment: Shipment;

    beforeEach(async () => {
      shipment = {
        _id: new Types.ObjectId('670e24737aa19da9ddf1823d'),
        orderId: '670b3b295af38bc7d1f020c1',
        address: '123 Main St',
        trackingNumber: null,
        estimatedDeliveryDate: null,
        actualDeliveryDate: null,
        save: jest.fn(),
      } as unknown as Shipment;
      shippingRepository.create.mockResolvedValue(shipment);
      shippingRepository.upsert.mockResolvedValue({} as Shipment);
      jest
        .spyOn(shippingService, 'deliver')
        .mockImplementation(() => Promise.resolve());

      await shippingService.ship(order, context);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call processShipping', async () => {
      jest.spyOn(shippingService, 'processShipping');
      await shippingService.ship(order, context);
      expect(shippingService.processShipping).toHaveBeenCalledWith(
        order.orderId,
      );
    });

    it('should call shippingRepository.create', async () => {
      expect(shippingRepository.create).toHaveBeenCalledWith({
        orderId: order.orderId,
        address: order.address,
      });
    });

    it('should call cancelShipping if shipment not created', async () => {
      shippingRepository.create.mockResolvedValueOnce(null);
      jest.spyOn(shippingService, 'cancelShipping');
      await shippingService.ship(order, context);
      expect(shippingService.cancelShipping).toHaveBeenCalledWith(
        order.orderId,
      );
    });

    it('should generate tracking number and calculate estimated delivery date', async () => {
      const upsertCall = shippingRepository.upsert.mock.calls[0];
      const updatedShipment = upsertCall[1];
      expect(updatedShipment.trackingNumber).toEqual(expect.any(String));
      expect(updatedShipment.estimatedDeliveryDate).toEqual(expect.any(Date));
      expect(shippingRepository.upsert).toHaveBeenCalledWith(
        {
          orderId: order.orderId,
        },
        expect.objectContaining({
          _id: new Types.ObjectId('670e24737aa19da9ddf1823d'),
          address: '123 Main St',
          actualDeliveryDate: null,
        }),
      );
    });

    it('should call shipped', async () => {
      jest.spyOn(shippingService, 'shipped');
      await shippingService.ship(order, context);
      expect(shippingService.shipped).toHaveBeenCalledWith(order.orderId);
    });

    it('should call deliver', async () => {
      jest.spyOn(shippingService, 'deliver');
      await shippingService.ship(order, context);
      expect(shippingService.deliver).toHaveBeenCalledWith(
        shipment.trackingNumber,
      );
    });

    it('should ack the message', async () => {
      expect(rmqService.ack).toHaveBeenCalledWith(context);
    });
  });
});
