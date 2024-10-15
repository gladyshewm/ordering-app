import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export class BillingDTO {
  @IsString()
  @ApiProperty({ example: '5f8f9c0f9f9f9f9f9f9f9f9f' })
  _id: string;

  @IsString()
  @ApiProperty({ example: '5f8f9c0f9f9f9f9f9f9f9f9f' })
  orderId: string;

  @IsPositive()
  @ApiProperty({ example: 100 })
  amount: number;

  @IsEnum(PaymentStatus)
  @ApiProperty({ example: 'pending', enum: PaymentStatus })
  status: PaymentStatus;

  @IsDate()
  @ApiProperty({ example: '2020-01-01T00:00:00.000Z' })
  createdAt: Date;

  @IsDate()
  @IsOptional()
  @ApiProperty({ example: '2020-01-01T00:00:00.000Z', required: false })
  processedAt?: Date;
}
