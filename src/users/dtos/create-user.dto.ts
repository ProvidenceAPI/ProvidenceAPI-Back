import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Rol } from 'src/common/enum/roles.enum';
import { UserStatus } from 'src/common/enum/userStatus.enum';
import { SignupDto } from 'src/modules/auth/dtos/singup.dto';

export class CreateUserDto extends SignupDto {
  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.active,
    description: 'Estado del usuario',
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
  @ApiProperty({
    enum: Rol,
    example: Rol.user,
    description: 'Rol del usuario',
    required: false,
  })
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;
}
