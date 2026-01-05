import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Enter your current password',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'It must be a password with letters, uppercase letters, numbers, and symbols',
  })
  @MinLength(8)
  @MaxLength(15)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])/, {
    message:
      'The New password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  newPassword: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Must confirm the password you entered previously',
  })
  @Validate(MatchPassword, ['password'])
  confirmPassword: string;
}
