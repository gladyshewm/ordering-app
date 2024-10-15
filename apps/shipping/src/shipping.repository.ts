import { Injectable } from '@nestjs/common';
import { AbstractRepository } from '@app/common';
import { Shipment } from './schemas/shipment.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ShippingRepository extends AbstractRepository<Shipment> {
  constructor(@InjectModel(Shipment.name) shipmentModel: Model<Shipment>) {
    super(shipmentModel);
  }
}
