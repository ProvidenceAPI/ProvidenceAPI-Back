import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SigninDto {
  @ApiProperty({
    example: 'sofia.canon@gmail.com',
    description: 'User email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Contraseña123*',
    description: 'User password',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
