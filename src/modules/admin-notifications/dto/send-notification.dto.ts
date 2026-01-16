import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendNotificationDto {
  @ApiProperty({
    description: 'Título de la notificación',
    example: 'Cierre por feriado',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Mensaje de la notificación',
    example:
      'El gimnasio permanecerá cerrado el 25 de mayo por feriado nacional.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;

  @ApiProperty({
    description: 'URL opcional para acción',
    example: 'https://providence.com/horarios',
    required: false,
  })
  @IsString()
  @IsOptional()
  actionUrl?: string;

  @ApiProperty({
    description: 'Texto del botón de acción',
    example: 'VER HORARIOS',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  actionText?: string;
}

export class HolidayClosureDto {
  @ApiProperty({
    description: 'Fecha del feriado (formato: DD/MM/YYYY)',
    example: '25/05/2026',
  })
  @IsString()
  @IsNotEmpty()
  holidayDate: string;

  @ApiProperty({
    description: 'Nombre del feriado',
    example: 'Día de la Revolución de Mayo',
  })
  @IsString()
  @IsNotEmpty()
  holidayName: string;

  @ApiProperty({
    description: 'Información adicional',
    example: 'Retomaremos actividades normalmente el día siguiente.',
    required: false,
  })
  @IsString()
  @IsOptional()
  additionalInfo?: string;
}

export class PromotionDto {
  @ApiProperty({
    description: 'Título de la promoción',
    example: '¡50% OFF en todas las actividades!',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  promotionTitle: string;

  @ApiProperty({
    description: 'Descripción de la promoción',
    example:
      'Durante todo el mes de febrero, obtén 50% de descuento en tu primera mensualidad.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  promotionDescription: string;

  @ApiProperty({
    description: 'Fecha de validez',
    example: 'Válido hasta el 28/02/2026',
    required: false,
  })
  @IsString()
  @IsOptional()
  validUntil?: string;
}
