import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export enum OrderStatus {
  CREATED = 'created',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class OrderItemDTO {
  @IsString()
  @ApiProperty({ example: 'iph' })
  sku: string;

  @IsPositive()
  @ApiProperty({ example: 2 })
  quantity: number;

  @IsPositive()
  @ApiProperty({ example: 9500.99 })
  price: number;
}

export class CreateOrderDTO {
  @ApiProperty({ type: () => [OrderItemDTO] })
  items: OrderItemDTO[];

  @IsString()
  @ApiProperty({ example: '123 Main St, Springfield' })
  address: string;

  @IsPhoneNumber()
  @ApiProperty({ example: '+79962285222' })
  phoneNumber: string;
}

export class OrderDTO extends CreateOrderDTO {
  @IsString()
  @ApiProperty({ example: '670b3b295af38bc7d1f020c1' })
  _id: string;

  @IsEnum(OrderStatus)
  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @IsPositive()
  @ApiProperty({ example: 19001.98 })
  totalPrice: number;

  @ApiProperty({ type: () => [StatusHistoryDTO] })
  statusHistory: StatusHistoryDTO[];
}

export class StatusHistoryDTO {
  @IsEnum(OrderStatus)
  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @IsDate()
  @ApiProperty({ example: new Date() })
  date: Date;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false, example: 'Comment for status' })
  comment?: string;
}

// export type CreatedOrderDTO = Omit<OrderDTO, 'status' | 'statusHistory'>;
export class CreatedOrderDTO extends CreateOrderDTO {
  @IsString()
  @ApiProperty({ example: '670b3b295af38bc7d1f020c1' })
  _id: string;

  @IsPositive()
  @ApiProperty({ example: 19001.98 })
  totalPrice: number;
}
