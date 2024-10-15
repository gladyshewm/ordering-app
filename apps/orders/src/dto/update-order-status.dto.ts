import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from './order.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderStatusDTO {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
