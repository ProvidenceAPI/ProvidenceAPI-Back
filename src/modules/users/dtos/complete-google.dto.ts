import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CompleteGoogleProfileDto {
  @ApiProperty({
    example: 40589652,
    description: 'Identity document (DNI)',
  })
  @IsNumber()
  @IsPositive()
  @Min(1000000)
  @Max(99999999)
  dni: number;

  @ApiProperty({
    example: '3157615003',
    description: 'Phone number',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,15}$/, {
    message: 'Phone number must contain between 10 and 15 digits',
  })
  phone: string;

  @ApiProperty({
    example: '1995-08-20',
    description: 'Birthdate (must be at least 18 years old)',
  })
  @IsDateString()
  birthdate: Date;
}
