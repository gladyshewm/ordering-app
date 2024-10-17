import { Test, TestingModule } from '@nestjs/testing';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';
import { RmqService } from '@app/common';
import { ClientProxy, RmqContext } from '@nestjs/microservices';
import { of } from 'rxjs';
import { ORDERS_SERVICE } from './constants/services';
import { BillingDTO, PaymentStatus } from './dto/billing.dto';
import { Payment } from './schemas/payment.schema';
import { Types } from 'mongoose';
import { PaymentDTO } from './dto/payment.dto';

jest.mock('./billing.repository');

describe('BillingService', () => {
  let billingService: BillingService;
  let billingRepository: jest.Mocked<BillingRepository>;
  let rmqService: jest.Mocked<RmqService>;
  const ordersClientMock: jest.Mocked<ClientProxy> = {
    send: jest.fn().mockReturnValue(of({})),
    emit: jest.fn().mockReturnValue(of({})),
  } as any;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        BillingRepository,
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

    billingService = app.get<BillingService>(BillingService);
    billingRepository =
      app.get<jest.Mocked<BillingRepository>>(BillingRepository);
    rmqService = app.get<jest.Mocked<RmqService>>(RmqService);
  });

  it('should be defined', () => {
    expect(billingService).toBeDefined();
  });

  describe('getPayments', () => {
    let result: BillingDTO[];
    const billings = [
      {
        _id: new Types.ObjectId('5f8f9c0f9f9f9f9f9f9f9f9f'),
        orderId: '5f8f9c0f9f9f9f9f9f9f9f9q',
        amount: 1,
        status: PaymentStatus.PENDING,
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
        processedAt: new Date('2020-03-01T00:00:00.000Z'),
      },
    ] as Payment[];

    beforeEach(async () => {
      billingRepository.find.mockResolvedValue(billings);
      result = await billingService.getPayments();
    });

    it('should call billingRepository.find', () => {
      expect(billingRepository.find).toHaveBeenCalled();
      expect(billingRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return payments', () => {
      const billings: BillingDTO[] = [
        {
          _id: '5f8f9c0f9f9f9f9f9f9f9f9f',
          orderId: '5f8f9c0f9f9f9f9f9f9f9f9q',
          amount: 1,
          status: PaymentStatus.PENDING,
          createdAt: new Date('2020-01-01T00:00:00.000Z'),
          processedAt: new Date('2020-03-01T00:00:00.000Z'),
        },
      ];
      expect(result).toEqual(billings);
    });

    it('should propagate error if billingRepository throws an error', async () => {
      billingRepository.find.mockRejectedValue(new Error());
      await expect(billingService.getPayments()).rejects.toThrow(Error);
    });
  });

  describe('getPaymentsByOrderId', () => {
    let result: BillingDTO[];
    const orderId = '5f8f9c0f9f9f9f9f9f9f9f9q';
    const billings = [
      {
        _id: new Types.ObjectId('5f8f9c0f9f9f9f9f9f9f9f9f'),
        orderId: orderId,
        amount: 1,
        status: PaymentStatus.PENDING,
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
        processedAt: new Date('2020-03-01T00:00:00.000Z'),
      },
    ] as Payment[];

    beforeEach(async () => {
      billingRepository.find.mockResolvedValue(billings);
      result = await billingService.getPaymentsByOrderId(orderId);
    });

    it('should call billingRepository.find', () => {
      expect(billingRepository.find).toHaveBeenCalledWith({ orderId });
      expect(billingRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return payments', () => {
      const billings: BillingDTO[] = [
        {
          _id: '5f8f9c0f9f9f9f9f9f9f9f9f',
          orderId: orderId,
          amount: 1,
          status: PaymentStatus.PENDING,
          createdAt: new Date('2020-01-01T00:00:00.000Z'),
          processedAt: new Date('2020-03-01T00:00:00.000Z'),
        },
      ];
      expect(result).toEqual(billings);
    });

    it('should propagate error if billingRepository throws an error', async () => {
      billingRepository.find.mockRejectedValue(new Error());
      await expect(
        billingService.getPaymentsByOrderId(orderId),
      ).rejects.toThrow(Error);
    });
  });

  describe('confirmPayment', () => {
    const paymentDetails: PaymentDTO = {
      orderId: '5f8f9c0f9f9f9f9f9f9f9f9q',
      totalPrice: 1,
      phoneNumber: '+1234567890',
    };

    beforeEach(async () => {
      await billingService.confirmPayment(paymentDetails);
    });

    it('should emit payment_successful event', () => {
      expect(ordersClientMock.emit).toHaveBeenCalledWith(
        'payment_successful',
        paymentDetails,
      );
    });

    it('should propagate error if ordersClient throws an error', async () => {
      ordersClientMock.emit.mockImplementationOnce(() => {
        throw new Error();
      });
      await expect(
        billingService.confirmPayment(paymentDetails),
      ).rejects.toThrow(Error);
    });
  });

  describe('cancelPayment', () => {
    const paymentDetails: PaymentDTO = {
      orderId: '5f8f9c0f9f9f9f9f9f9f9f9q',
      totalPrice: 1,
      phoneNumber: '+1234567890',
    };

    beforeEach(async () => {
      await billingService.cancelPayment(paymentDetails);
    });

    it('should emit payment_failed event', () => {
      expect(ordersClientMock.emit).toHaveBeenCalledWith(
        'payment_failed',
        paymentDetails,
      );
    });

    it('should propagate error if ordersClient throws an error', async () => {
      ordersClientMock.emit.mockImplementationOnce(() => {
        throw new Error();
      });
      await expect(
        billingService.cancelPayment(paymentDetails),
      ).rejects.toThrow(Error);
    });
  });

  describe('bill', () => {
    const paymentDetails: PaymentDTO = {
      orderId: '5f8f9c0f9f9f9f9f9f9f9f9q',
      totalPrice: 1,
      phoneNumber: '+1234567890',
    };
    const context = {} as RmqContext;

    beforeEach(async () => {
      const payment = {
        _id: new Types.ObjectId('5f8f9c0f9f9f9f9f9f9f9f9f'),
        orderId: paymentDetails.orderId,
        amount: paymentDetails.totalPrice,
        status: PaymentStatus.PENDING,
        createdAt: new Date('2024-10-16T07:51:00.929Z'),
        processedAt: null,
      } as Payment;
      billingRepository.create.mockResolvedValue(payment);
      billingRepository.upsert.mockResolvedValue({} as Payment);
      await billingService.bill(paymentDetails, context);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call billingRepository.create', () => {
      expect(billingRepository.create).toHaveBeenCalledWith({
        orderId: paymentDetails.orderId,
        amount: paymentDetails.totalPrice,
      });
      expect(billingRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should call cancelPayment if payment is not created', async () => {
      billingRepository.create.mockRejectedValue(new Error());
      jest.spyOn(billingService, 'cancelPayment');
      await billingService.bill(paymentDetails, context);
      expect(billingService.cancelPayment).toHaveBeenCalledWith(paymentDetails);
    });

    it('should change payment status and set processedAt date', async () => {
      const fixedDate = new Date('2024-10-16T07:51:00.929Z');
      jest.spyOn(global, 'Date').mockImplementation(() => fixedDate);
      await billingService.bill(paymentDetails, context);
      expect(billingRepository.upsert).toHaveBeenCalledWith(
        { orderId: paymentDetails.orderId },
        {
          _id: new Types.ObjectId('5f8f9c0f9f9f9f9f9f9f9f9f'),
          orderId: paymentDetails.orderId,
          amount: paymentDetails.totalPrice,
          status: PaymentStatus.SUCCESSFUL,
          createdAt: new Date(),
          processedAt: new Date(),
        },
      );
      jest.restoreAllMocks();
    });

    it('should call confirmPayment', async () => {
      jest.spyOn(billingService, 'confirmPayment');
      await billingService.bill(paymentDetails, context);
      expect(billingService.confirmPayment).toHaveBeenCalledWith(
        paymentDetails,
      );
    });

    it('should ack the message', async () => {
      expect(rmqService.ack).toHaveBeenCalledWith(context);
      expect(rmqService.ack).toHaveBeenCalledTimes(1);
    });
  });
});
