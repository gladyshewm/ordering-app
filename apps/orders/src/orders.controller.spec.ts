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
});
