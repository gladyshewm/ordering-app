import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from './order.dto';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsString()
  @IsOptional()
  comment?: string;
}
