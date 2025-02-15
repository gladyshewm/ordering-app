import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common';

enum OrderStatus {
  CREATED = 'created',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Schema()
export class StatusHistory {
  @Prop({ required: true, enum: OrderStatus })
  status: OrderStatus;

  @Prop({ required: true })
  date: Date;

  @Prop()
  comment?: string;
}

@Schema()
export class OrderItem {
  @Prop({ required: true })
  sku: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;
}

@Schema({ versionKey: false, timestamps: true })
export class Order extends AbstractDocument {
  @Prop({ type: [OrderItem], required: true })
  items: OrderItem[];

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  totalPrice: number;

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.CREATED })
  status: OrderStatus;

  @Prop({
    type: [StatusHistory],
    default: [{ status: OrderStatus.CREATED, date: new Date() }],
  })
  statusHistory: StatusHistory[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);

/* OrderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.statusHistory.push({
      status: this.status,
      date: new Date(),
    });
  }

  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      date: new Date(),
      comment: `Status changed to ${this.status}`,
    });
  }

  next();
}); */
