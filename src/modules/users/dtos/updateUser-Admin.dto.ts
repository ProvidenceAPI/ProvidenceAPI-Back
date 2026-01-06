import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Rol } from 'src/common/enum/roles.enum';

export class UpdateUserAdminDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;
}
