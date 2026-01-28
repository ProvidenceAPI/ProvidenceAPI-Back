import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTestimonialDto {
  @ApiProperty({ example: 'Providence changed my life!' })
  @IsString()
  @MinLength(10, {
    message: 'The comment must be at least 10 characters long.',
  })
  @MaxLength(500, { message: 'The comment cannot exceed 500 characters' })
  comment: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1, { message: 'The minimum rating is 1 star' })
  @Max(5, { message: 'The maximum rating is 5 stars' })
  rating: number;

  @ApiProperty({ example: 'Professional gymnast' })
  @IsString()
  @IsOptional()
  profession: string;
}
