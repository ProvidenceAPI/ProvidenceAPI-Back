import { IsEnum } from 'class-validator';
import { UserStatus } from 'src/common/enum/userStatus.enum';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}
