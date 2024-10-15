import { IsDate, IsOptional, IsString } from 'class-validator';

export class ShipmentDTO {
  @IsString()
  orderId: string;

  @IsString()
  address: string;

  @IsString()
  trackingNumber?: string;

  @IsDate()
  @IsOptional()
  estimatedDeliveryDate?: Date;

  @IsDate()
  @IsOptional()
  actualDeliveryDate?: Date;
}
