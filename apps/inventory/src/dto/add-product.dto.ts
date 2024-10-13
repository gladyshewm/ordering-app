import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNumber, IsString } from 'class-validator';

export class ReservationDTO {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsDate()
  expiresAt: Date;
}

export class AddProductDTO {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;
}

export class ProductDTO extends AddProductDTO {
  @ApiProperty()
  _id: string;

  reservations: ReservationDTO[];
}
