import { IsPhoneNumber, IsPositive, IsString } from 'class-validator';

export class PaymentDTO {
  @IsString()
  orderId: string;

  @IsPositive()
  totalPrice: number;

  @IsPhoneNumber()
  phoneNumber: string;
}
