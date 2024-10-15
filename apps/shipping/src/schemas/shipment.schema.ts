import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common';

@Schema({ versionKey: false })
export class Shipment extends AbstractDocument {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  address: string;

  // @Prop({
  //   type: String,
  //   enum: ['processing', 'ready', 'shipped', 'delivered', 'cancelled'],
  //   default: 'processing',
  // })
  // status: string;

  @Prop()
  trackingNumber?: string;

  @Prop({ type: Date })
  estimatedDeliveryDate?: Date;

  @Prop({ type: Date })
  actualDeliveryDate?: Date;
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);
