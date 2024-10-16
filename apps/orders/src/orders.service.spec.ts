import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import {
  BILLING_SERVICE,
  INVENTORY_SERVICE,
  SHIPPING_SERVICE,
} from './constants/services';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { RmqService } from '@app/common';
import {
  CreatedOrderDTO,
  CreateOrderDTO,
  OrderDTO,
  OrderStatus,
} from './dto/order.dto';
import { Types } from 'mongoose';
import { Order } from './schemas/order.schema';
import { ClientProxy, RmqContext } from '@nestjs/microservices';
import { of } from 'rxjs';
import { PaymentDTO } from './dto/payment.dto';

jest.mock('./orders.repository');

describe('OrdersService', () => {
  let ordersService: OrdersService;
  let ordersRepository: jest.Mocked<OrdersRepository>;

  let inventoryClientMock: jest.Mocked<ClientProxy>;
  let billingClientMock: jest.Mocked<ClientProxy>;
  let shippingClientMock: jest.Mocked<ClientProxy>;
  let rmqService: jest.Mocked<RmqService>;

  beforeEach(async () => {
    inventoryClientMock = {
      send: jest.fn().mockReturnValue(of({ success: true })),
      emit: jest.fn().mockReturnValue(of({})),
    } as any;

    billingClientMock = {
      send: jest.fn().mockReturnValue(of({ success: true })),
      emit: jest.fn().mockReturnValue(of({})),
    } as any;

    shippingClientMock = {
      send: jest.fn().mockReturnValue(of({ success: true })),
      emit: jest.fn().mockReturnValue(of({})),
    } as any;

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validationSchema: Joi.object({
            MONGODB_URI: Joi.string().required(),
            PORT: Joi.number().required().default(3000),
            RABBIT_MQ_URI: Joi.string().required(),
            RABBIT_MQ_ORDERS_QUEUE: Joi.string().required(),
            RABBIT_MQ_BILLING_QUEUE: Joi.string().required(),
            RABBIT_MQ_INVENTORY_QUEUE: Joi.string().required(),
            RABBIT_MQ_SHIPPING_QUEUE: Joi.string().required(),
          }),
          envFilePath: './apps/orders/.env',
        }),
      ],
      providers: [
        OrdersService,
        OrdersRepository,
        {
          provide: RmqService,
          useValue: {
            ack: jest.fn(),
          },
        },
        {
          provide: INVENTORY_SERVICE,
          useValue: inventoryClientMock,
        },
        {
          provide: BILLING_SERVICE,
          useValue: billingClientMock,
        },
        {
          provide: SHIPPING_SERVICE,
          useValue: shippingClientMock,
        },
      ],
    }).compile();

    ordersService = app.get<OrdersService>(OrdersService);
    ordersRepository = app.get<jest.Mocked<OrdersRepository>>(OrdersRepository);
    rmqService = app.get<jest.Mocked<RmqService>>(RmqService);
  });

  describe('root', () => {
    it('should be defined', () => {
      expect(ordersService).toBeDefined();
    });
  });

  describe('reserveInventory', () => {
    let result: { success: boolean };
    const createdOrder: CreatedOrderDTO = {
      _id: 'testID',
      items: [],
      address: 'test',
      phoneNumber: 'test',
      totalPrice: 500,
    };

    beforeEach(async () => {
      result = await ordersService.reserveInventory(createdOrder);
    });

    it('should call inventoryClient.send', async () => {
      expect(inventoryClientMock.send).toHaveBeenCalledWith(
        'order_created',
        createdOrder,
      );
      expect(inventoryClientMock.send).toHaveBeenCalledTimes(1);
    });

    it('should return { success: true } if inventoryClient.send resolves', async () => {
      expect(result).toEqual({ success: true });
    });

    it('should return { success: false } if inventoryClient.send throws', async () => {
      inventoryClientMock.send.mockImplementationOnce(() => {
        throw new Error();
      });
      result = await ordersService.reserveInventory(createdOrder);
      expect(result).toEqual({ success: false });
    });
  });

  describe('processPayment', () => {
    const paymentDetails: PaymentDTO = {
      orderId: 'testID',
      totalPrice: 500,
      phoneNumber: 'test',
    };

    beforeEach(async () => {
      await ordersService.processPayment(paymentDetails);
    });

    it('should call billingClient.emit', async () => {
      expect(billingClientMock.emit).toHaveBeenCalledWith(
        'order_confirmed',
        paymentDetails,
      );
      expect(billingClientMock.emit).toHaveBeenCalledTimes(1);
    });

    it('should propagate error if billingClient.emit throws', async () => {
      billingClientMock.emit.mockImplementationOnce(() => {
        throw new Error();
      });
      await expect(
        ordersService.processPayment(paymentDetails),
      ).rejects.toThrow(Error);
    });
  });

  describe('createOrder', () => {
    let result: CreatedOrderDTO;
    const items = [
      {
        sku: 'test1',
        quantity: 1,
        price: 100,
      },
      {
        sku: 'test2',
        quantity: 2,
        price: 200,
      },
    ];
    const request: CreateOrderDTO = {
      items: items,
      address: 'test',
      phoneNumber: 'test',
    };

    beforeEach(async () => {
      const mockObjectId = new Types.ObjectId('670f51075710a8ff613659f3');
      const mockOrder = {
        _id: mockObjectId,
        items: items,
        address: 'test',
        phoneNumber: 'test',
        totalPrice: 500,
        status: OrderStatus.CREATED,
        statusHistory: [],
      } as Order;
      // для updateOrderStatus
      ordersRepository.findOne.mockResolvedValue(mockOrder);
      ordersRepository.updateOrder.mockResolvedValue(mockOrder);

      ordersRepository.create.mockResolvedValue(mockOrder);
    });

    it('should call ordersRepository', async () => {
      await ordersService.createOrder(request);

      expect(ordersRepository.create).toHaveBeenCalledWith({
        ...request,
        totalPrice: 500,
      });
      expect(ordersRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should call reserveInventory', async () => {
      jest.spyOn(ordersService, 'reserveInventory');
      await ordersService.createOrder(request);

      expect(ordersService.reserveInventory).toHaveBeenCalledWith({
        _id: '670f51075710a8ff613659f3',
        items: items,
        address: 'test',
        phoneNumber: 'test',
        totalPrice: 500,
      });
      expect(ordersService.reserveInventory).toHaveBeenCalledTimes(1);
    });

    describe('when reserveInventory resolves', () => {
      it('should update order status to confirmed', async () => {
        jest.spyOn(ordersService, 'updateOrderStatus');
        await ordersService.createOrder(request);

        expect(ordersService.updateOrderStatus).toHaveBeenCalledWith(
          '670f51075710a8ff613659f3',
          OrderStatus.CONFIRMED,
        );
        expect(ordersService.updateOrderStatus).toHaveBeenCalledTimes(1);
      });

      it('should call processPayment', async () => {
        jest.spyOn(ordersService, 'processPayment');
        await ordersService.createOrder(request);

        expect(ordersService.processPayment).toHaveBeenCalledWith({
          orderId: '670f51075710a8ff613659f3',
          totalPrice: 500,
          phoneNumber: 'test',
        });
        expect(ordersService.processPayment).toHaveBeenCalledTimes(1);
      });
    });

    describe('when reserveInventory throws', () => {
      it('should update order status to cancelled', async () => {
        jest.spyOn(ordersService, 'updateOrderStatus');
        inventoryClientMock.send.mockImplementationOnce(() => {
          throw new Error();
        });
        await ordersService.createOrder(request);

        expect(ordersService.updateOrderStatus).toHaveBeenCalledWith(
          '670f51075710a8ff613659f3',
          OrderStatus.CANCELLED,
        );
        expect(ordersService.updateOrderStatus).toHaveBeenCalledTimes(1);
      });
    });

    it('should return created order', async () => {
      result = await ordersService.createOrder(request);
      expect(result).toEqual({
        _id: '670f51075710a8ff613659f3',
        items: items,
        address: 'test',
        phoneNumber: 'test',
        totalPrice: 500,
      });
    });

    it('should propagate error if ordersRepository throws', async () => {
      ordersRepository.create.mockImplementationOnce(() => {
        throw new Error();
      });
      await expect(ordersService.createOrder(request)).rejects.toThrow(Error);
    });
  });

  describe('getOrders', () => {
    let result: OrderDTO[];

    beforeEach(async () => {
      const orders = [
        {
          _id: new Types.ObjectId('670f51075710a8ff613659f3'),
          items: [],
          address: 'test',
          phoneNumber: 'test',
          status: OrderStatus.CREATED,
          totalPrice: 1,
          statusHistory: [],
        },
      ] as Order[];
      ordersRepository.find.mockResolvedValue(orders);
      result = await ordersService.getOrders();
    });

    it('should call ordersRepository', async () => {
      expect(ordersRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return orders', async () => {
      expect(result).toEqual([
        {
          _id: '670f51075710a8ff613659f3',
          items: [],
          address: 'test',
          phoneNumber: 'test',
          status: OrderStatus.CREATED,
          totalPrice: 1,
          statusHistory: [],
        },
      ]);
    });

    it('should propagate error if ordersRepository throws', async () => {
      ordersRepository.find.mockImplementationOnce(() => {
        throw new Error();
      });
      await expect(ordersService.getOrders()).rejects.toThrow(Error);
    });
  });

  describe('getOrder', () => {
    let result: OrderDTO;
    const orderId = '670f51075710a8ff613659f3';

    beforeEach(async () => {
      const order = {
        _id: new Types.ObjectId(orderId),
        items: [],
        address: 'test',
        phoneNumber: 'test',
        status: OrderStatus.CREATED,
        totalPrice: 1,
        statusHistory: [],
      } as Order;
      ordersRepository.findOne.mockResolvedValue(order);
      result = await ordersService.getOrder(orderId);
    });

    it('should call ordersRepository', async () => {
      expect(ordersRepository.findOne).toHaveBeenCalledWith({
        _id: orderId,
      });
      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should return order', async () => {
      expect(result).toEqual({
        _id: orderId,
        items: [],
        address: 'test',
        phoneNumber: 'test',
        status: OrderStatus.CREATED,
        totalPrice: 1,
        statusHistory: [],
      });
    });

    it('should propagate error if ordersRepository throws', async () => {
      ordersRepository.findOne.mockImplementationOnce(() => {
        throw new Error();
      });
      await expect(ordersService.getOrder(orderId)).rejects.toThrow(Error);
    });
  });

  describe('updateOrderStatus', () => {
    let result: OrderDTO;
    const fixedDate = new Date('2024-10-16T07:51:00.929Z');

    beforeEach(async () => {
      jest.spyOn(global, 'Date').mockImplementation(() => fixedDate);
      const mockObjectId = new Types.ObjectId('670f51075710a8ff613659f3');
      const mockOrder = {
        _id: mockObjectId,
        items: [],
        address: 'test',
        phoneNumber: 'test',
        totalPrice: 500,
        status: OrderStatus.CREATED,
        statusHistory: [
          {
            status: OrderStatus.CREATED,
            date: new Date('2024-10-16T07:51:00.929Z'),
          },
        ],
      } as Order;
      ordersRepository.findOne.mockResolvedValue(mockOrder);
      ordersRepository.updateOrder.mockResolvedValue(mockOrder);
      result = await ordersService.updateOrderStatus(
        '670f51075710a8ff613659f3',
        OrderStatus.CANCELLED,
      );
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should call ordersRepository.findOne', async () => {
      expect(ordersRepository.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId('670f51075710a8ff613659f3'),
      });
      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if order not found', async () => {
      ordersRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        ordersService.updateOrderStatus(
          '670f51075710a8ff613659f3',
          OrderStatus.CANCELLED,
        ),
      ).rejects.toThrow(Error);
    });

    it('should throw an error if status transition not allowed', async () => {
      await expect(
        ordersService.updateOrderStatus(
          '670f51075710a8ff613659f3',
          OrderStatus.DELIVERED,
        ),
      ).rejects.toThrow(Error);
    });

    it('should call ordersRepository.updateOrder', async () => {
      const updateOrder = {
        _id: new Types.ObjectId('670f51075710a8ff613659f3'),
        items: [],
        address: 'test',
        phoneNumber: 'test',
        totalPrice: 500,
        status: OrderStatus.CANCELLED,
        statusHistory: [
          {
            status: OrderStatus.CREATED,
            date: new Date('2024-10-16T07:51:00.929Z'),
          },
          {
            status: OrderStatus.CANCELLED,
            date: new Date(),
            comment: 'Status changed from created to cancelled',
          },
        ],
      } as Order;
      expect(ordersRepository.updateOrder).toHaveBeenCalledWith(updateOrder);
      expect(ordersRepository.updateOrder).toHaveBeenCalledTimes(1);
    });

    it('should return updated order', async () => {
      expect(result).toEqual({
        _id: '670f51075710a8ff613659f3',
        items: [],
        address: 'test',
        phoneNumber: 'test',
        status: OrderStatus.CANCELLED,
        totalPrice: 500,
        statusHistory: [
          {
            status: OrderStatus.CREATED,
            date: new Date('2024-10-16T07:51:00.929Z'),
          },
          {
            status: OrderStatus.CANCELLED,
            date: new Date(),
            comment: 'Status changed from created to cancelled',
          },
        ],
      });
    });
  });

  describe('deliverTheOrder', () => {
    const orderId = '670f51075710a8ff613659f7';

    beforeEach(async () => {
      const order = {
        _id: new Types.ObjectId(orderId),
        items: [],
        address: 'test',
        phoneNumber: 'test',
        status: OrderStatus.PROCESSING,
        totalPrice: 1,
        statusHistory: [],
      } as Order;
      ordersRepository.findOne.mockResolvedValue(order);
    });

    it('should call ordersRepository.findOne', async () => {
      await ordersService.deliverTheOrder(orderId);
      expect(ordersRepository.findOne).toHaveBeenCalledWith(
        {
          _id: orderId,
        },
        {
          orderId: 1,
          address: 1,
        },
      );
      expect(ordersRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should emit order_paid event', async () => {
      await ordersService.deliverTheOrder(orderId);
      expect(shippingClientMock.emit).toHaveBeenCalledWith('order_paid', {
        orderId,
        address: 'test',
      });
    });

    it('should throw an error if order not found', async () => {
      ordersRepository.findOne.mockResolvedValueOnce(null);
      await expect(ordersService.deliverTheOrder(orderId)).rejects.toThrow(
        Error,
      );
      expect(shippingClientMock.emit).not.toHaveBeenCalled();
    });
  });

  describe('events', () => {
    const orderId = '670f51075710a8ff613659f7';
    const context = {} as RmqContext;

    beforeEach(async () => {
      jest
        .spyOn(ordersService, 'updateOrderStatus')
        .mockImplementation(() => Promise.resolve({} as OrderDTO));
    });

    describe('handleInventoryUnavailable', () => {
      beforeEach(async () => {
        jest
          .spyOn(ordersService, 'deliverTheOrder')
          .mockImplementation(() => Promise.resolve());
        await ordersService.handleInventoryUnavailable(orderId, context);
      });

      it('should call updateOrderStatus', async () => {
        jest.spyOn(ordersService, 'updateOrderStatus');
        await ordersService.handleInventoryUnavailable(orderId, context);

        expect(ordersService.updateOrderStatus).toHaveBeenCalledWith(
          orderId,
          OrderStatus.CANCELLED,
        );
      });

      it('should ack the message', async () => {
        expect(rmqService.ack).toHaveBeenCalled();
        expect(rmqService.ack).toHaveBeenCalledTimes(1);
      });
    });

    describe('handlePaymentSuccessful', () => {
      beforeEach(async () => {
        await ordersService.handlePaymentSuccessful(orderId, context);
      });

      it('should call updateOrderStatus', async () => {
        jest.spyOn(ordersService, 'updateOrderStatus');
        await ordersService.handlePaymentSuccessful(orderId, context);

        expect(ordersService.updateOrderStatus).toHaveBeenCalledWith(
          orderId,
          OrderStatus.PAID,
        );
      });

      it('should call deliverTheOrder', async () => {
        jest.spyOn(ordersService, 'deliverTheOrder');
        await ordersService.handlePaymentSuccessful(orderId, context);

        expect(ordersService.deliverTheOrder).toHaveBeenCalledWith(orderId);
      });

      it('should ack the message', async () => {
        expect(rmqService.ack).toHaveBeenCalled();
        expect(rmqService.ack).toHaveBeenCalledTimes(1);
      });

      it('should not call deliverTheOrder if updateOrderStatus is not successful', async () => {
        jest
          .spyOn(ordersService, 'updateOrderStatus')
          .mockImplementation(() => Promise.reject());
        jest.spyOn(ordersService, 'deliverTheOrder');
        await ordersService.handlePaymentSuccessful(orderId, context);

        expect(ordersService.deliverTheOrder).not.toHaveBeenCalled();
      });
    });

    describe('handleShippingProcessing', () => {
      beforeEach(async () => {
        await ordersService.handleShippingProcessing(orderId, context);
      });

      it('should call updateOrderStatus', async () => {
        jest.spyOn(ordersService, 'updateOrderStatus');
        await ordersService.handleShippingProcessing(orderId, context);

        expect(ordersService.updateOrderStatus).toHaveBeenCalledWith(
          orderId,
          OrderStatus.PROCESSING,
        );
      });

      it('should ack the message', async () => {
        expect(rmqService.ack).toHaveBeenCalledTimes(1);
      });
    });

    describe('handleOrderShipped', () => {
      beforeEach(async () => {
        await ordersService.handleOrderShipped(orderId, context);
      });

      it('should call updateOrderStatus', async () => {
        jest.spyOn(ordersService, 'updateOrderStatus');
        await ordersService.handleOrderShipped(orderId, context);

        expect(ordersService.updateOrderStatus).toHaveBeenCalledWith(
          orderId,
          OrderStatus.SHIPPED,
        );
      });

      it('should ack the message', async () => {
        expect(rmqService.ack).toHaveBeenCalledTimes(1);
      });
    });

    describe('handleOrderDelivered', () => {
      beforeEach(async () => {
        await ordersService.handleOrderDelivered(orderId, context);
      });

      it('should call updateOrderStatus', async () => {
        jest.spyOn(ordersService, 'updateOrderStatus');
        await ordersService.handleOrderDelivered(orderId, context);

        expect(ordersService.updateOrderStatus).toHaveBeenCalledWith(
          orderId,
          OrderStatus.DELIVERED,
        );
      });

      it('should ack the message', async () => {
        expect(rmqService.ack).toHaveBeenCalledTimes(1);
      });
    });
  });
});
