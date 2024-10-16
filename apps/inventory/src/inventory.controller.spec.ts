import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import {
  AddProductDTO,
  ProductDTO,
  ReservationDTO,
} from './dto/add-product.dto';
import { RmqContext } from '@nestjs/microservices';
import { CreatedOrderDTO } from './dto/order-created.dto';

jest.mock('./inventory.service');

describe('InventoryController', () => {
  let inventoryController: InventoryController;
  let inventoryService: jest.Mocked<InventoryService>;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [InventoryService],
    }).compile();

    inventoryController = app.get<InventoryController>(InventoryController);
    inventoryService = app.get<jest.Mocked<InventoryService>>(InventoryService);
  });

  describe('root', () => {
    it('should be defined', () => {
      expect(inventoryController).toBeDefined();
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
      inventoryService.getProducts.mockResolvedValue(products);
      result = await inventoryController.getProducts();
    });

    it('should call inventoryService.getProducts', () => {
      expect(inventoryService.getProducts).toHaveBeenCalled();
      expect(inventoryService.getProducts).toHaveBeenCalledTimes(1);
    });

    it('should return products', () => {
      expect(result).toEqual(products);
    });

    it('should propagate error if inventoryService throws an error', async () => {
      inventoryService.getProducts.mockRejectedValue(new Error());
      await expect(inventoryController.getProducts()).rejects.toThrow(Error);
    });
  });

  describe('addProducts', () => {
    let result: ProductDTO;
    const product: AddProductDTO = {
      name: 'Product 1',
      sku: 'sku-1',
      quantity: 10,
    };
    const addedProduct: ProductDTO = {
      _id: '1',
      name: 'Product 1',
      sku: 'sku-1',
      quantity: 10,
      reservations: [],
    };

    beforeEach(async () => {
      inventoryService.addProducts.mockResolvedValue(addedProduct);
      result = await inventoryController.addProducts(product);
    });

    it('should call inventoryService.addProducts', () => {
      expect(inventoryService.addProducts).toHaveBeenCalledWith(product);
      expect(inventoryService.addProducts).toHaveBeenCalledTimes(1);
    });

    it('should return added product', () => {
      expect(result).toEqual(addedProduct);
    });

    it('should propagate error if inventoryService throws an error', async () => {
      inventoryService.addProducts.mockRejectedValue(new Error());
      await expect(inventoryController.addProducts(product)).rejects.toThrow(
        Error,
      );
    });
  });

  describe('getReservations', () => {
    let result: ReservationDTO[];
    const reservations: ReservationDTO[] = [
      {
        _id: '670e2472a75b5d52968bb45d',
        orderId: 'order-1',
        quantity: 10,
        expiresAt: new Date(),
      },
      {
        _id: '670e2472a75b5d52968bb45e',
        orderId: 'order-2',
        quantity: 20,
        expiresAt: new Date(),
      },
    ];

    beforeEach(async () => {
      inventoryService.getReservations.mockResolvedValue(reservations);
      result = await inventoryController.getReservations();
    });

    it('should call inventoryService.getReservations', () => {
      expect(inventoryService.getReservations).toHaveBeenCalled();
      expect(inventoryService.getReservations).toHaveBeenCalledTimes(1);
    });

    it('should return reservations', () => {
      expect(result).toEqual(reservations);
    });

    it('should propagate error if inventoryService throws an error', async () => {
      inventoryService.getReservations.mockRejectedValue(new Error());
      await expect(inventoryController.getReservations()).rejects.toThrow(
        Error,
      );
    });
  });

  describe('messages', () => {
    const context = {} as RmqContext;

    describe('handleOrderCreated', () => {
      let result: { success: boolean };
      const createdOrder: CreatedOrderDTO = {
        _id: '1',
        items: [],
        address: 'address',
        phoneNumber: '+1234567890',
        totalPrice: 100,
      };

      it('should call inventoryService.handleOrderCreated', async () => {
        inventoryService.reserveItems.mockResolvedValue();
        result = await inventoryController.handleOrderCreated(
          createdOrder,
          context,
        );
        expect(inventoryService.reserveItems).toHaveBeenCalledWith(
          createdOrder,
          context,
        );
        expect(inventoryService.reserveItems).toHaveBeenCalledTimes(1);
      });

      it('should return { success: true } if inventoryService.reserveItems resolves', () => {
        expect(result).toEqual({ success: true });
      });

      it('should return { success: false } if inventoryService.reserveItems rejects', async () => {
        inventoryService.reserveItems.mockRejectedValue(new Error());
        result = await inventoryController.handleOrderCreated(
          createdOrder,
          context,
        );
        expect(result).toEqual({ success: false });
      });
    });
  });
});
