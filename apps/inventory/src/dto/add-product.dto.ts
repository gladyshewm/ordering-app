import { IsDate, IsNumber, IsString } from 'class-validator';

export class Reservation {
  @IsString()
  orderId: string;

  @IsNumber()
  quantity: number;

  @IsDate()
  expiresAt: Date;
}

export class AddProductDTO {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsNumber()
  quantity: number;
}

export class ProductDTO extends AddProductDTO {
  _id: string;
  reservations: Reservation[];
}
