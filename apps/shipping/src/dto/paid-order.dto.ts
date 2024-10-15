import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PaidOrderDTO {
  @IsString()
  @ApiProperty({ example: '670b3b295af38bc7d1f020c1' })
  orderId: string;

  @IsString()
  @ApiProperty({ example: '123 Main St, Springfield' })
  address: string;
}
