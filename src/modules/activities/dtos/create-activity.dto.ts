import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  IsOptional,
  MinLength,
  MaxLength,
  IsDecimal,
} from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({
    example: 'Yoga Matutino',
    description: 'Nombre de la actividad',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example:
      'Clase de yoga para todos los niveles, enfocada en flexibilidad y relajación',
    description: 'Descripción detallada de la actividad',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @ApiProperty({
    example: 60,
    description: 'Duración de la sesión en minutos',
  })
  @IsNumber()
  @IsPositive()
  @Min(15)
  @Max(180)
  duration: number;

  @ApiProperty({
    example: 24,
    description: 'Tiempo límite de cancelación en horas antes de la clase',
    default: 24,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(72)
  cancellationTime?: number;

  @ApiProperty({
    example: 15,
    description: 'Cantidad de días anticipados para reservar',
    default: 15, // revisar con fede cuantos dias **
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(30)
  reservationDays?: number;

  @ApiProperty({
    example: 15,
    description: 'Cupo máximo de participantes (mínimo 1, máximo 20)',
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(20)
  capacity: number;

  @ApiProperty({
    example: true,
    description: 'Si la actividad ofrece una clase de prueba gratuita',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasFreeTrial?: boolean;

  @ApiProperty({
    example: 25000.0,
    description: 'Precio mensual de la actividad',
  })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({
    example: ['Lunes 10:00', 'Miércoles 18:00', 'Viernes 10:00'],
    description: 'Horarios disponibles (formato: "Día HH:MM")',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  schedule: string[];

  @ApiProperty({
    example: 'https://res.cloudinary.com/ejemplo/image/upload/v123/yoga.jpg',
    description: 'URL de la imagen de la actividad (se sube con Cloudinary)',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;
}
