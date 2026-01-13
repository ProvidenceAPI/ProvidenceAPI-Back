import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    example: 'b1a2c3d4-e5f6-7890-abcd-123456789abc',
    description: 'ID de la reserva a pagar (opcional si es suscripción)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  reservationId: string;

  @ApiProperty({
    example: 'a2b3c4d5-e6f7-8901-bcde-234567890def',
    description: 'ID de la actividad (requerido para suscripciones)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  activityId?: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
