import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Rol } from 'src/common/enum/roles.enum';

export class UpdateUserRoleDto {
  @ApiProperty({
    enum: Rol,
    example: Rol.admin,
    description: 'New role for the user',
  })
  @IsEnum(Rol, { message: 'Invalid role' })
  role: Rol;
}
