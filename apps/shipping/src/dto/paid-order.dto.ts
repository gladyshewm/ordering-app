import { IsString } from 'class-validator';

export class PaidOrderDTO {
  @IsString()
  orderId: string;

  @IsString()
  address: string;
}
