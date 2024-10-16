import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDTO } from './dto/update-order-status.dto';
import {
  CreatedOrderDTO,
  CreateOrderDTO,
  OrderDTO,
  OrderStatus,
} from './dto/order.dto';
import { RmqContext } from '@nestjs/microservices';
import { PaymentDTO } from './dto/payment.dto';

jest.mock('./orders.service');

describe('OrdersController', () => {
  let ordersController: OrdersController;
  let ordersService: jest.Mocked<OrdersService>;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [OrdersService],
    }).compile();

    ordersController = app.get<OrdersController>(OrdersController);
    ordersService = app.get<jest.Mocked<OrdersService>>(OrdersService);
  });

  describe('root', () => {
    it('should be defined', () => {
      expect(ordersController).toBeDefined();
    });
  });

  describe('createOrder', () => {
    let createdOrder: CreatedOrderDTO;
    const order = {
      items: [],
      address: 'test',
      phoneNumber: 'test',
    } as CreateOrderDTO;
    const createdOrderDto: CreatedOrderDTO = {
      _id: 'testID',
      items: [],
      address: 'test',
      phoneNumber: 'test',
      totalPrice: 1,
    };

    beforeEach(async () => {
      ordersService.createOrder.mockResolvedValue(createdOrderDto);
      createdOrder = await ordersController.createOrder(order);
    });

    it('should call ordersService', async () => {
      expect(ordersService.createOrder).toHaveBeenCalledWith(order);
      expect(ordersService.createOrder).toHaveBeenCalledTimes(1);
    });

    it('should return created order', async () => {
      expect(createdOrder).toEqual(createdOrderDto);
    });

    it('should propagate error if ordersService throws an error', async () => {
      ordersService.createOrder.mockRejectedValue(new Error());

      await expect(ordersController.createOrder(order)).rejects.toThrow(Error);
    });
  });

  describe('getOrders', () => {
    let result: OrderDTO[];
    const orders = [
      {
        _id: 'testID',
        items: [],
        address: 'test',
        phoneNumber: 'test',
        status: OrderStatus.CREATED,
        totalPrice: 1,
        statusHistory: [],
      },
      {
        _id: 'testID2',
        items: [],
        address: 'test22',
        phoneNumber: 'test2',
        status: OrderStatus.CREATED,
        totalPrice: 2,
        statusHistory: [],
      },
    ] as OrderDTO[];

    beforeEach(async () => {
      ordersService.getOrders.mockResolvedValue(orders);
      result = await ordersController.getOrders();
    });

    it('should call ordersService', async () => {
      expect(ordersService.getOrders).toHaveBeenCalledTimes(1);
    });

    it('should return orders', async () => {
      expect(result).toEqual(orders);
    });

    it('should propagate error if ordersService throws an error', async () => {
      ordersService.getOrders.mockRejectedValue(new Error());

      await expect(ordersController.getOrders()).rejects.toThrow(Error);
    });
  });

  describe('getOrder', () => {
    let result: OrderDTO;
    const order: OrderDTO = {
      _id: 'testID',
      items: [],
      address: 'test',
      phoneNumber: 'test',
      status: OrderStatus.CREATED,
      totalPrice: 1,
      statusHistory: [],
    };

    beforeEach(async () => {
      ordersService.getOrder.mockResolvedValue(order);
      result = await ordersController.getOrder('testID');
    });

    it('should call ordersService', async () => {
      expect(ordersService.getOrder).toHaveBeenCalledWith('testID');
      expect(ordersService.getOrder).toHaveBeenCalledTimes(1);
    });

    it('should return order', async () => {
      expect(result).toEqual(order);
    });

    it('should propagate error if ordersService throws an error', async () => {
      ordersService.getOrder.mockRejectedValue(new Error());

      await expect(ordersController.getOrder('testID')).rejects.toThrow(Error);
    });
  });

  describe('updateOrderStatus', () => {
    let result: OrderDTO;
    const order: OrderDTO = {
      _id: 'testID',
      items: [],
      address: 'test',
      phoneNumber: 'test',
      totalPrice: 1,
      status: OrderStatus.DELIVERED,
      statusHistory: [
        { status: OrderStatus.CREATED, date: new Date() },
        { status: OrderStatus.DELIVERED, date: new Date() },
      ],
    };
    const updateStatusDto: UpdateOrderStatusDTO = {
      status: OrderStatus.DELIVERED,
      comment: 'test comment',
    };

    beforeEach(async () => {
      ordersService.updateOrderStatus.mockResolvedValue(order);
      result = await ordersController.updateOrderStatus(
        'testID',
        updateStatusDto,
      );
    });

    it('should call ordersService', async () => {
      expect(ordersService.updateOrderStatus).toHaveBeenCalledWith(
        'testID',
        OrderStatus.DELIVERED,
        'test comment',
      );
      expect(ordersService.updateOrderStatus).toHaveBeenCalledTimes(1);
    });

    it('should return updated order', async () => {
      expect(result).toEqual(order);
    });

    it('should propagate error if ordersService throws an error', async () => {
      ordersService.updateOrderStatus.mockRejectedValue(new Error());

      await expect(
        ordersController.updateOrderStatus('testID', updateStatusDto),
      ).rejects.toThrow(Error);
    });
  });

  describe('events', () => {
    const context = {} as unknown as RmqContext;

    describe('handleInventoryUnavailable', () => {
      const createdOrder: CreatedOrderDTO = {
        _id: 'testID',
        items: [],
        address: 'test',
        phoneNumber: 'test',
        totalPrice: 1,
      };

      beforeEach(async () => {
        ordersService.handleInventoryUnavailable.mockResolvedValue();
        await ordersController.handleInventoryUnavailable(
          createdOrder,
          context,
        );
      });

      it('should call ordersService', async () => {
        expect(ordersService.handleInventoryUnavailable).toHaveBeenCalledWith(
          'testID',
          context,
        );
        expect(ordersService.handleInventoryUnavailable).toHaveBeenCalledTimes(
          1,
        );
      });

      it('should propagate error if ordersService throws an error', async () => {
        ordersService.handleInventoryUnavailable.mockRejectedValue(new Error());

        await expect(
          ordersController.handleInventoryUnavailable(createdOrder, context),
        ).rejects.toThrow(Error);
      });
    });

    describe('handlePaymentSuccessful', () => {
      const payment: PaymentDTO = {
        orderId: 'testID',
        totalPrice: 1,
        phoneNumber: 'test',
      };

      beforeEach(async () => {
        ordersService.handlePaymentSuccessful.mockResolvedValue();
        await ordersController.handlePaymentSuccessful(payment, context);
      });

      it('should call ordersService', async () => {
        expect(ordersService.handlePaymentSuccessful).toHaveBeenCalledWith(
          'testID',
          context,
        );
        expect(ordersService.handlePaymentSuccessful).toHaveBeenCalledTimes(1);
      });

      it('should propagate error if ordersService throws an error', async () => {
        ordersService.handlePaymentSuccessful.mockRejectedValue(new Error());

        await expect(
          ordersController.handlePaymentSuccessful(payment, context),
        ).rejects.toThrow(Error);
      });
    });

    describe('handleShippingProcessing', () => {
      const orderId = 'testID';

      beforeEach(async () => {
        ordersService.handleShippingProcessing.mockResolvedValue();
        await ordersController.handleShippingProcessing(orderId, context);
      });

      it('should call ordersService', async () => {
        expect(ordersService.handleShippingProcessing).toHaveBeenCalledWith(
          'testID',
          context,
        );
        expect(ordersService.handleShippingProcessing).toHaveBeenCalledTimes(1);
      });

      it('should propagate error if ordersService throws an error', async () => {
        ordersService.handleShippingProcessing.mockRejectedValue(new Error());

        await expect(
          ordersController.handleShippingProcessing(orderId, context),
        ).rejects.toThrow(Error);
      });
    });

    describe('handleOrderShipped', () => {
      const orderId = 'testID';

      beforeEach(async () => {
        ordersService.handleOrderShipped.mockResolvedValue();
        await ordersController.handleOrderShipped(orderId, context);
      });

      it('should call ordersService', async () => {
        expect(ordersService.handleOrderShipped).toHaveBeenCalledWith(
          'testID',
          context,
        );
        expect(ordersService.handleOrderShipped).toHaveBeenCalledTimes(1);
      });

      it('should propagate error if ordersService throws an error', async () => {
        ordersService.handleOrderShipped.mockRejectedValue(new Error());

        await expect(
          ordersController.handleOrderShipped(orderId, context),
        ).rejects.toThrow(Error);
      });
    });

    describe('handleOrderDelivered', () => {
      const orderId = 'testID';

      beforeEach(async () => {
        ordersService.handleOrderDelivered.mockResolvedValue();
        await ordersController.handleOrderDelivered(orderId, context);
      });

      it('should call ordersService', async () => {
        expect(ordersService.handleOrderDelivered).toHaveBeenCalledWith(
          'testID',
          context,
        );
        expect(ordersService.handleOrderDelivered).toHaveBeenCalledTimes(1);
      });

      it('should propagate error if ordersService throws an error', async () => {
        ordersService.handleOrderDelivered.mockRejectedValue(new Error());

        await expect(
          ordersController.handleOrderDelivered(orderId, context),
        ).rejects.toThrow(Error);
      });
    });
  });
});
