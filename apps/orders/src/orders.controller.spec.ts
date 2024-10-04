import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './schemas/order.schema';
import { Types } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

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
    let createdOrder: Order;
    const order = {
      _id: 'testID' as unknown as Types.ObjectId,
      name: 'test',
      price: 1,
      phoneNumber: 'test',
    } as Order;
    const createOrderDto: CreateOrderDto = {
      name: 'test',
      price: 1,
      phoneNumber: 'test',
    };

    beforeEach(async () => {
      ordersService.createOrder.mockResolvedValue(order);
      createdOrder = await ordersController.createOrder(createOrderDto);
    });

    it('should call ordersService', async () => {
      expect(ordersService.createOrder).toHaveBeenCalledWith(createOrderDto);
      expect(ordersService.createOrder).toHaveBeenCalledTimes(1);
    });

    it('should return created order', async () => {
      expect(createdOrder).toEqual(order);
    });

    it('should propagate error if ordersService throws an error', async () => {
      ordersService.createOrder.mockRejectedValue(new Error());

      await expect(
        ordersController.createOrder(createOrderDto),
      ).rejects.toThrow(Error);
    });
  });

  describe('getOrders', () => {
    let result: Order[];
    const orders = [
      {
        _id: 'testID' as unknown as Types.ObjectId,
        name: 'test',
        price: 1,
        phoneNumber: 'test',
      },
      {
        _id: 'testID2' as unknown as Types.ObjectId,
        name: 'test2',
        price: 2,
        phoneNumber: 'test2',
      },
    ] as Order[];

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
    let result: Order;
    const order = {
      _id: 'testID' as unknown as Types.ObjectId,
      name: 'test',
      price: 1,
      phoneNumber: 'test',
    } as Order;

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
    let result: Order;
    const order = {
      _id: 'testID' as unknown as Types.ObjectId,
      name: 'test',
      price: 1,
      phoneNumber: 'test',
      status: OrderStatus.DELIVERED,
      statusHistory: [
        { status: OrderStatus.CREATED, date: new Date() },
        { status: OrderStatus.DELIVERED, date: new Date() },
      ],
    } as Order;
    const updateStatusDto: UpdateOrderStatusDto = {
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
});
