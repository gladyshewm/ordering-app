import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common';

@Schema({ versionKey: false, timestamps: true })
export class Payment extends AbstractDocument {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({
    type: String,
    enum: ['pending', 'successful', 'failed', 'refunded'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date })
  processedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
