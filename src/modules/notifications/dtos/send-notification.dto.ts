import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendNotificationDto {
  @ApiProperty({
    example: 'Nueva Actividad Disponible',
    description: 'Título de la notificación',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example:
      'Ya está disponible nuestra nueva clase de Pilates. ¡Reserva tu lugar!',
    description: 'Mensaje de la notificación',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    example: 'https://providencefitness.com/activities/pilates',
    description: 'URL de acción (opcional)',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  actionUrl?: string;

  @ApiProperty({
    example: 'Ver Actividad',
    description: 'Texto del botón de acción (opcional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  actionText?: string;
}
