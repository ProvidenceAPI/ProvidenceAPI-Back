import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  Validate,
  IsNumber,
  IsEnum,
  IsDate,
} from 'class-validator';
import { Genre } from 'src/common/enum/genre.enum';

export class CreateUserDto {
  @ApiProperty({
    example: 'apholo@gmail.com',
    description: 'Must be a valid email',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Apholo',
    description: 'It must contain a minimum of 3 letters',
  })
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  name: string;

  @ApiProperty({
    example: 'Smith',
    description: 'It must contain a minimum of 3 letters',
  })
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  lastname: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'It must be a password with letters, uppercase letters, numbers, and symbols',
  })
  @MinLength(8)
  @MaxLength(15)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  password: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Must confirm the password you entered previously',
  })
  @Validate(MatchPassword, ['password'])
  confirmPassword: string;

  @ApiProperty({
    example: '08/06/2001',
    description: 'It must contain a real birthdate',
  })
  @IsDate()
  birthdate: Date;

  @ApiProperty({
    example: 3517891302,
    description: 'It must contain a valid telephone number',
  })
  @IsNotEmpty()
  @IsNumber()
  phone: number;

  @ApiProperty({
    example: 34568971,
    description: 'It must contain a valid identification number',
  })
  @IsNotEmpty()
  @IsNumber()
  dni: number;

  @ApiProperty({
    example: 'Female',
    description: 'You must select your gender',
  })
  @IsEnum(Genre)
  genre: string;
}
