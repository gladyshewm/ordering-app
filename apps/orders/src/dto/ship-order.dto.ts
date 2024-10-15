import { IsString } from 'class-validator';

export class OrderToShipDTO {
  @IsString()
  orderId: string;

  @IsString()
  address: string;
}
