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
    description: 'El nombre del usuario',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  name: string;

  @ApiProperty({
    example: 'Cañón',
    description: 'El apellido del usuario',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  lastname: string;

  @ApiProperty({
    example: 'sofia.canon@gmail.com',
    description: 'El email debe ser válido',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Contraseña123*',
    description:
      'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(15)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message:
      'La contraseña debe contener al menos una minúscula, una mayúscula, un número y un carácter especial (!@#$%^&*)',
  })
  password: string;

  @ApiProperty({
    example: 'Contraseña123*',
    description: 'La confirmación debe ser igual a la contraseña',
  })
  @IsString()
  @IsNotEmpty()
  @Validate(MatchPassword, ['password'])
  confirmPassword: string;

  @ApiProperty({
    example: '1991-03-12',
    description: 'Fecha de nacimiento (debe ser mayor de 18 años)',
  })
  @IsDateString()
  birthdate: Date;

  @ApiProperty({
    example: '3157615003',
    description: 'Número de teléfono',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'El teléfono debe contener entre 10 y 15 dígitos',
  })
  phone: string;

  @ApiProperty({
    example: 123456789,
    description: 'Documento de identidad',
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
    description: 'Género del usuario',
  })
  @IsEnum(Genre)
  genre: Genre;
}
