import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityStatus } from '../entities/activity.entity';

export class FilterActivityDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado de la actividad',
  })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @ApiPropertyOptional({
    example: 'Yoga',
    description: 'Buscar actividad por nombre (búsqueda parcial)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 20000,
    description: 'Precio mínimo',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Precio máximo',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar actividades con turno gratis',
  })
  @IsOptional()
  @Type(() => Boolean)
  hasFreeTrial?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Número de página',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Cantidad de resultados por página',
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
