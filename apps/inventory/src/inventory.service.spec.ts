import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { ProductRepository } from './product.repository';
import { ReservationRepository } from './reservation.repository';
import { RmqService } from '@app/common';
import {
  AddProductDTO,
  ProductDTO,
  ReservationDTO,
} from './dto/add-product.dto';
import { Types } from 'mongoose';
import { Reservation } from './schemas/reservation.schema';
import { CreatedOrderDTO, OrderItemDTO } from './dto/order-created.dto';
import { Product } from './schemas/product.schema';
import { RmqContext } from '@nestjs/microservices';

jest.mock('./product.repository');
jest.mock('./reservation.repository');

describe('InventoryService', () => {
  let inventoryService: InventoryService;
  let productRepository: jest.Mocked<ProductRepository>;
  let reservationRepository: jest.Mocked<ReservationRepository>;
  let rmqService: jest.Mocked<RmqService>;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        ProductRepository,
        ReservationRepository,
        {
          provide: RmqService,
          useValue: {
            ack: jest.fn(),
          },
        },
      ],
    }).compile();

    inventoryService = app.get<InventoryService>(InventoryService);
    productRepository =
      app.get<jest.Mocked<ProductRepository>>(ProductRepository);
    reservationRepository = app.get<jest.Mocked<ReservationRepository>>(
      ReservationRepository,
    );
    rmqService = app.get<jest.Mocked<RmqService>>(RmqService);
  });

  describe('root', () => {
    it('should be defined', () => {
      expect(inventoryService).toBeDefined();
    });
  });

  describe('addProducts', () => {
    let result: ProductDTO;
    const products: AddProductDTO = {
      name: 'Product 1',
      sku: 'sku-1',
      quantity: 10,
    };
    const createdProduct: ProductDTO = {
      _id: '1',
      name: 'Product 1',
      sku: 'sku-1',
      quantity: 10,
      reservations: [],
    };

    beforeEach(async () => {
      productRepository.createAndPopulate.mockResolvedValue(createdProduct);
      result = await inventoryService.addProducts(products);
    });

    it('should call productRepository.createAndPopulate', () => {
      expect(productRepository.createAndPopulate).toHaveBeenCalledWith(
        products,
      );
      expect(productRepository.createAndPopulate).toHaveBeenCalledTimes(1);
    });

    it('should return created product', () => {
      expect(result).toEqual(createdProduct);
    });

    it('should propagate error if productRepository throws an error', async () => {
      productRepository.createAndPopulate.mockRejectedValue(new Error());
      await expect(inventoryService.addProducts(products)).rejects.toThrow(
        Error,
      );
    });
  });

  describe('getProducts', () => {
    let result: ProductDTO[];
    const products: ProductDTO[] = [
      {
        _id: '1',
        name: 'Product 1',
        sku: 'sku-1',
        quantity: 10,
        reservations: [],
      },
      {
        _id: '2',
        name: 'Product 2',
        sku: 'sku-2',
        quantity: 20,
        reservations: [],
      },
    ];

    beforeEach(async () => {
      productRepository.findAndPopulate.mockResolvedValue(products);
      result = await inventoryService.getProducts();
    });

    it('should call productRepository.findAndPopulate', () => {
      expect(productRepository.findAndPopulate).toHaveBeenCalled();
      expect(productRepository.findAndPopulate).toHaveBeenCalledTimes(1);
    });

    it('should return products', () => {
      expect(result).toEqual(products);
    });

    it('should propagate error if productRepository throws an error', async () => {
      productRepository.findAndPopulate.mockRejectedValue(new Error());
      await expect(inventoryService.getProducts()).rejects.toThrow(Error);
    });
  });

  describe('getReservations', () => {
    let result: ReservationDTO[];
    const reservations = [
      {
        _id: new Types.ObjectId('670e2472a75b5d52968bb45a'),
        orderId: 'order-1',
        quantity: 10,
        expiresAt: new Date('2022-01-01'),
      },
      {
        _id: new Types.ObjectId('670e2472a75b5d52968bb45b'),
        orderId: 'order-2',
        quantity: 20,
        expiresAt: new Date('2022-01-01'),
      },
    ] as Reservation[];

    beforeEach(async () => {
      reservationRepository.find.mockResolvedValue(reservations);
      result = await inventoryService.getReservations();
    });

    it('should call reservationRepository.find', () => {
      expect(reservationRepository.find).toHaveBeenCalled();
      expect(reservationRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return reservations', () => {
      expect(result).toEqual([
        {
          _id: '670e2472a75b5d52968bb45a',
          orderId: 'order-1',
          quantity: 10,
          expiresAt: new Date('2022-01-01'),
        },
        {
          _id: '670e2472a75b5d52968bb45b',
          orderId: 'order-2',
          quantity: 20,
          expiresAt: new Date('2022-01-01'),
        },
      ]);
    });

    it('should propagate error if reservationRepository throws an error', async () => {
      reservationRepository.find.mockRejectedValue(new Error());
      await expect(inventoryService.getReservations()).rejects.toThrow(Error);
    });
  });

  describe('reserveItems', () => {
    const items: OrderItemDTO[] = [
      {
        sku: 'sku-1',
        quantity: 10,
        price: 100,
      },
      {
        sku: 'sku-2',
        quantity: 15,
        price: 200,
      },
    ];
    const orderId = '670e2472a75b5d52968bb45f';
    const createdOrder: CreatedOrderDTO = {
      _id: orderId,
      items: items,
      address: 'address',
      phoneNumber: '+1234567890',
      totalPrice: 100,
    };
    const context = {} as RmqContext;

    beforeEach(async () => {
      const product1 = {
        _id: new Types.ObjectId('670e2472a75b5d52968bb45a'),
        name: 'Product 1',
        sku: 'sku-1',
        quantity: 10,
        reservations: [],
      } as Product;
      const product2 = {
        _id: new Types.ObjectId('670e2472a75b5d52968bb45b'),
        name: 'Product 2',
        sku: 'sku-2',
        quantity: 20,
        reservations: [],
      } as Product;
      const reservation1 = {
        _id: new Types.ObjectId('670e2472a75b5d52968bb45c'),
        orderId: orderId,
        quantity: 10,
        expiresAt: new Date('2022-01-01'),
      } as Reservation;
      const reservation2 = {
        _id: new Types.ObjectId('670e2472a75b5d52968bb45d'),
        orderId: orderId,
        quantity: 15,
        expiresAt: new Date('2022-01-01'),
      } as Reservation;

      productRepository.findOne
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);
      reservationRepository.create
        .mockResolvedValueOnce(reservation1)
        .mockResolvedValueOnce(reservation2);
      productRepository.upsert.mockResolvedValue(product1);
      await inventoryService.reserveItems(createdOrder, context);
    });

    it('should call productRepository.findOne', async () => {
      expect(productRepository.findOne).toHaveBeenCalled();
      expect(productRepository.findOne).toHaveBeenCalledTimes(
        createdOrder.items.length,
      );
    });

    it('should throw error if product is not found', async () => {
      productRepository.findOne.mockResolvedValueOnce(null);
      await expect(
        inventoryService.reserveItems(createdOrder, context),
      ).rejects.toThrow(Error);
    });

    it('should call reservationRepository.create', async () => {
      expect(reservationRepository.create).toHaveBeenCalled();
      expect(reservationRepository.create).toHaveBeenCalledTimes(
        createdOrder.items.length,
      );
    });

    it('should throw error if reservation is not created', async () => {
      reservationRepository.create.mockResolvedValueOnce(null);
      await expect(
        inventoryService.reserveItems(createdOrder, context),
      ).rejects.toThrow(Error);
    });

    it('should decrement product quantity and push reservation to product', async () => {
      const updatedProduct1 = {
        _id: new Types.ObjectId('670e2472a75b5d52968bb45a'),
        name: 'Product 1',
        sku: 'sku-1',
        quantity: 0,
        reservations: [new Types.ObjectId('670e2472a75b5d52968bb45c')],
      };
      const updatedProduct2 = {
        _id: new Types.ObjectId('670e2472a75b5d52968bb45b'),
        name: 'Product 2',
        sku: 'sku-2',
        quantity: 5,
        reservations: [new Types.ObjectId('670e2472a75b5d52968bb45d')],
      };

      expect(productRepository.upsert).toHaveBeenCalledWith(
        { _id: updatedProduct1._id },
        updatedProduct1,
      );
      expect(productRepository.upsert).toHaveBeenCalledWith(
        { _id: updatedProduct2._id },
        updatedProduct2,
      );
      expect(productRepository.upsert).toHaveBeenCalledTimes(
        createdOrder.items.length,
      );
    });

    it('should call productRepository.upsert', async () => {
      expect(productRepository.upsert).toHaveBeenCalled();
      expect(productRepository.upsert).toHaveBeenCalledTimes(
        createdOrder.items.length,
      );
    });

    it('should throw error if product is not updated', async () => {
      productRepository.upsert.mockRejectedValueOnce(new Error());
      await expect(
        inventoryService.reserveItems(createdOrder, context),
      ).rejects.toThrow(Error);
    });

    it('should ack the message', async () => {
      expect(rmqService.ack).toHaveBeenCalledWith(context);
      expect(rmqService.ack).toHaveBeenCalledTimes(1);
    });
  });
});
