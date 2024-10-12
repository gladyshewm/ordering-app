import { Injectable } from '@nestjs/common';
import { AbstractRepository } from '@app/common';
import { Reservation } from './schemas/product.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ReservationRepository extends AbstractRepository<Reservation> {
  constructor(@InjectModel(Reservation.name) productModel: Model<Reservation>) {
    super(productModel);
  }
}
