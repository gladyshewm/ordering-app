import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { RmqService } from '@app/common';
import { ORDERS_SERVICE } from './constants/services';
import { ClientProxy, RmqContext } from '@nestjs/microservices';
import { BillingRepository } from './billing.repository';
import { PaymentDTO } from './dto/payment.dto';

@Injectable()
export class BillingService {
  private logger = new Logger(BillingService.name);

  constructor(
    private readonly rmqService: RmqService,
    private readonly billingRepository: BillingRepository,
    @Inject(ORDERS_SERVICE) private readonly ordersClient: ClientProxy,
  ) {}

  async bill(paymentDetails: PaymentDTO, context: RmqContext) {
    try {
      this.logger.log(`Billing for order ${paymentDetails.orderId}...`);

      const payment = await this.billingRepository.create({
        orderId: paymentDetails.orderId,
        amount: paymentDetails.totalPrice,
      });

      const isPaymentSuccessful = await this.verifyPayment(paymentDetails);

      if (!isPaymentSuccessful) {
        throw new Error('Payment verification failed');
      }

      payment.status = 'successful';
      payment.processedAt = new Date();
      await this.billingRepository.upsert(
        { orderId: payment.orderId },
        payment,
      );

      await this.confirmPayment(paymentDetails);
    } catch (error) {
      this.logger.error('Error processing order', error);
      await this.cancelPayment(paymentDetails);
    } finally {
      this.rmqService.ack(context);
    }
  }

  // eslint-disable-next-line
  private async verifyPayment(paymentDetails: PaymentDTO): Promise<boolean> {
    // Здесь была бы интеграция с платежной системой
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Неудача в 10% случаев
    return Math.random() > 0.1;
  }

  async refundPayment(orderId: string) {
    try {
      const payment = await this.billingRepository.findOne({
        orderId,
        status: 'successful',
      });

      if (!payment) {
        throw new NotFoundException(
          `No successful payment found for order ${orderId}`,
        );
      }

      // Здесь была бы логика возврата средств через платежную систему
      await new Promise((resolve) => setTimeout(resolve, 1000));

      payment.status = 'refunded';
      payment.processedAt = new Date();
      await this.billingRepository.upsert(
        { orderId: payment.orderId },
        payment,
      );
    } catch (error) {
      this.logger.error('Failed to refund payment', error);
      throw new Error('Failed to refund payment');
    }
  }

  async confirmPayment(payment: PaymentDTO) {
    try {
      await lastValueFrom(
        this.ordersClient.emit('payment_successful', payment),
      );
      this.logger.log('Successfully emitted payment_successful event');
    } catch (error) {
      this.logger.error('Failed to emit payment_successful event', error);
    }
  }

  async cancelPayment(payment: PaymentDTO) {
    try {
      await lastValueFrom(this.ordersClient.emit('payment_failed', payment));
      this.logger.log('Successfully emitted payment_failed event');
    } catch (error) {
      this.logger.error('Failed to emit payment_failed event', error);
    }
  }
}
