import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class ShipmentDTO {
  @IsString()
  @ApiProperty({ example: '670e24737aa19da9ddf1823d' })
  _id: string;

  @IsString()
  @ApiProperty({ example: '670b3b295af38bc7d1f020c1' })
  orderId: string;

  @IsString()
  @ApiProperty({ example: '123 Main St, Springfield' })
  address: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'TN123456789', required: false })
  trackingNumber?: string;

  @IsDate()
  @IsOptional()
  @ApiProperty({ example: '2022-01-01', required: false })
  estimatedDeliveryDate?: Date;

  @IsDate()
  @IsOptional()
  @ApiProperty({ example: '2022-01-01', required: false })
  actualDeliveryDate?: Date;
}
