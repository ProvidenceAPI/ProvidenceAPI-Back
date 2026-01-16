import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Rol } from 'src/common/enum/roles.enum';
import { Genre } from 'src/common/enum/genre.enum';

export class CreateUserAdminDto {
  @ApiProperty({
    example: 'Juan',
    description: 'User first name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'User last name',
  })
  @IsString()
  @IsNotEmpty()
  lastname: string;

  @ApiProperty({
    example: 'juan.perez@example.com',
    description: 'User email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'User password (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({
    example: '1990-01-15',
    description: 'User birthdate',
  })
  @IsString()
  @IsNotEmpty()
  birthdate: string;

  @ApiProperty({
    example: '1234567890',
    description: 'User phone number',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: '12345678',
    description: 'User DNI',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{7,8}$/, {
    message: 'DNI must be 7 or 8 digits',
  })
  dni: string;

  @ApiProperty({
    enum: Genre,
    example: Genre.male,
    description: 'User genre',
    required: false,
  })
  @IsEnum(Genre)
  @IsOptional()
  genre?: Genre;

  @ApiProperty({
    enum: Rol,
    example: Rol.user,
    description: 'User role (default: user)',
    required: false,
  })
  @IsEnum(Rol)
  @IsOptional()
  role?: Rol;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'User profile image URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  profileImage?: string;
}
