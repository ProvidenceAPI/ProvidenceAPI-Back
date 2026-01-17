import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    example: 'a2b3c4d5-e6f7-8901-bcde-234567890def',
    description: 'ID de la actividad (requerido para suscripciones)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  activityId?: string;
}
