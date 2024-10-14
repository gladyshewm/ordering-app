import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common';

@Schema({ versionKey: false })
export class Reservation extends AbstractDocument {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  expiresAt: Date;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);
