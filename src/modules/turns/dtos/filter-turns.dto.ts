import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TurnStatus } from '../entities/turn.entity';

export class FilterTurnsDto {
  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-123456789abc',
    description: 'Filter by activity ID',
  })
  @IsOptional()
  @IsUUID()
  activityId?: string;

  @ApiPropertyOptional({
    example: '2025-02-01',
    description: 'Filter turns from this date onwards',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2025-02-28',
    description: 'Filter turns up to this date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: TurnStatus,
    example: TurnStatus.available,
    description: 'Filter by turn status',
  })
  @IsOptional()
  @IsEnum(TurnStatus)
  status?: TurnStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter only available turns (with spots)',
  })
  @IsOptional()
  @Type(() => Boolean)
  onlyAvailable?: boolean;
}
