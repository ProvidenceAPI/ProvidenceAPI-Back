import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  Matches,
  IsOptional,
  IsBoolean,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateTurnDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-123456789abc',
    description: 'ID of the activity',
  })
  @IsUUID()
  activityId: string;

  @ApiProperty({
    example: '2025-02-15',
    description: 'Date of the turn',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    example: '10:00',
    description: 'Start time (HH:mm format)',
  })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({
    example: '11:00',
    description: 'End time (HH:mm format)',
  })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @ApiProperty({
    example: 20,
    description:
      'Capacity for this turn (optional, defaults to activity capacity)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @ApiProperty({
    example: false,
    description: 'Whether this is a free trial turn',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isFreeTrial?: boolean;

  @ApiProperty({
    example: 'Special instructor today',
    description: 'Notes about this turn',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
