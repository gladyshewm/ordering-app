import { Injectable } from '@nestjs/common';
import { AbstractRepository } from '@app/common';
import { Payment } from './schemas/payment.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class BillingRepository extends AbstractRepository<Payment> {
  constructor(@InjectModel(Payment.name) paymentModel: Model<Payment>) {
    super(paymentModel);
  }
}
