import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common';
import { Types } from 'mongoose';

@Schema({ versionKey: false, timestamps: true })
export class Product extends AbstractDocument {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  // артикул
  sku: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Reservation', default: [] }],
  })
  reservations: Types.ObjectId[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
