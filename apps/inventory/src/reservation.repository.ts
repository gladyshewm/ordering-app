import { Injectable } from '@nestjs/common';
import { AbstractRepository } from '@app/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reservation } from './schemas/reservation.schema';

@Injectable()
export class ReservationRepository extends AbstractRepository<Reservation> {
  constructor(@InjectModel(Reservation.name) productModel: Model<Reservation>) {
    super(productModel);
  }
}
