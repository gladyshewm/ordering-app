import { Test, TestingModule } from '@nestjs/testing';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingDTO, PaymentStatus } from './dto/billing.dto';
import { PaymentDTO } from './dto/payment.dto';
import { RmqContext } from '@nestjs/microservices';

jest.mock('./billing.service');

describe('BillingController', () => {
  let billingController: BillingController;
  let billingService: jest.Mocked<BillingService>;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [BillingService],
    }).compile();

    billingController = app.get<BillingController>(BillingController);
    billingService = app.get<jest.Mocked<BillingService>>(BillingService);
  });

  describe('root', () => {
    it('should be defined', () => {
      expect(billingController).toBeDefined();
    });
  });

  describe('getPayments', () => {
    let result: BillingDTO[];
    const billing: BillingDTO[] = [
      {
        _id: '1',
        orderId: '1',
        amount: 1,
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        processedAt: new Date(),
      },
    ];

    beforeEach(async () => {
      billingService.getPayments.mockResolvedValue(billing);
      result = await billingController.getPayments();
    });

    it('should call billingService.getPayments', async () => {
      expect(billingService.getPayments).toHaveBeenCalled();
      expect(billingService.getPayments).toHaveBeenCalledTimes(1);
    });

    it('should return payments', async () => {
      expect(result).toEqual(billing);
    });

    it('should propagate error if billingService throws an error', async () => {
      billingService.getPayments.mockRejectedValue(new Error());
      await expect(billingController.getPayments()).rejects.toThrow(Error);
    });
  });

  describe('getPaymentsByOrderId', () => {
    let result: BillingDTO[];
    const billing: BillingDTO[] = [
      {
        _id: '1',
        orderId: '1',
        amount: 1,
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        processedAt: new Date(),
      },
    ];

    beforeEach(async () => {
      billingService.getPaymentsByOrderId.mockResolvedValue(billing);
      result = await billingController.getPaymentsByOrderId('1');
    });

    it('should call billingService.getPaymentsByOrderId', async () => {
      expect(billingService.getPaymentsByOrderId).toHaveBeenCalledWith('1');
      expect(billingService.getPaymentsByOrderId).toHaveBeenCalledTimes(1);
    });

    it('should return payments', async () => {
      expect(result).toEqual(billing);
    });

    it('should propagate error if billingService throws an error', async () => {
      billingService.getPaymentsByOrderId.mockRejectedValue(new Error());
      await expect(billingController.getPaymentsByOrderId('1')).rejects.toThrow(
        Error,
      );
    });
  });

  describe('events', () => {
    const context = {} as RmqContext;

    describe('handleOrderCreated', () => {
      const paymentDetails: PaymentDTO = {
        orderId: '1',
        totalPrice: 1,
        phoneNumber: '+1234567890',
      };

      beforeEach(async () => {
        billingService.bill.mockResolvedValue();
        await billingController.handleOrderCreated(paymentDetails, context);
      });

      it('should call billingService.bill', async () => {
        expect(billingService.bill).toHaveBeenCalledWith(
          paymentDetails,
          context,
        );
        expect(billingService.bill).toHaveBeenCalledTimes(1);
      });

      it('should propagate error if billingService throws an error', async () => {
        billingService.bill.mockRejectedValue(new Error());
        await expect(
          billingController.handleOrderCreated(paymentDetails, context),
        ).rejects.toThrow(Error);
      });
    });
  });
});
