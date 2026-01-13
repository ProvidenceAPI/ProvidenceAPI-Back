import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class GenerateTurnsDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-123456789abc',
    description: 'ID of the activity to generate turns for',
  })
  @IsUUID()
  activityId: string;

  @ApiProperty({
    example: '2025-02-01',
    description: 'Start date for turn generation',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2025-02-28',
    description: 'End date for turn generation',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    example: 7,
    description:
      'Number of days to generate turns for (alternative to endDate)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  daysAhead?: number;
}
