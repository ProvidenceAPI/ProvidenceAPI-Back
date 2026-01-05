import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
} from 'class-validator';
import { Genre } from 'src/common/enum/genre.enum';
import { MatchPassword } from 'src/common/helper/matchPassword';

export class SignupDto {
  @ApiProperty({
    example: 'Sofia',
    description: 'User name',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  name: string;

  @ApiProperty({
    example: 'Cañón',
    description: 'User Last name',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  lastname: string;
  @ApiProperty({
    example: 'sofia.canon@gmail.com',
    description: 'Email must be valid',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Contraseña123*',
    description:
      'The password must contain uppercase letters, lowercase letters, numbers and special characters',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(15)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message:
      'The password must contain uppercase letters, lowercase letters, numbers and special characters (!@#$%^&*)',
  })
  password: string;

  @ApiProperty({
    example: 'Contraseña123*',
    description: 'The confirmation must match the password',
  })
  @IsString()
  @IsNotEmpty()
  @Validate(MatchPassword, ['password'])
  confirmPassword: string;

  @ApiProperty({
    example: '1991-03-12',
    description: 'Date of birth (must be at least 18 years old)',
  })
  @IsDateString()
  birthdate: Date;

  @ApiProperty({
    example: '3157615003',
    description: 'Phone number',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'The phone number must contain between 10 and 15 digits',
  })
  phone: string;

  @ApiProperty({
    example: 123456789,
    description: 'Identity document',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  @Min(1000000)
  @Max(9999999999)
  dni: number;

  @ApiProperty({
    enum: Genre,
    example: Genre.female,
    description: 'User gender',
  })
  @IsEnum(Genre)
  genre: Genre;
}
