import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class MercadoPagoWebhookDto {
  @ApiProperty({ example: 'payment', description: 'Type of the webhook event' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    example: 'payment.updated',
    description: 'Action performed on the payment',
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({
    example: { id: '123456789' },
    description: 'Payment data object',
  })
  @IsObject()
  data: {
    id: string;
  };

  @ApiProperty({
    example: '2025-01-13T12:00:00.000-04:00',
    description: 'Date when the webhook was created',
    required: false,
  })
  @IsOptional()
  @IsString()
  date_created?: string;

  @ApiProperty({
    required: false,
    description: 'User ID associated with the webhook',
  })
  @IsOptional()
  @IsString()
  user_id?: string;
}
