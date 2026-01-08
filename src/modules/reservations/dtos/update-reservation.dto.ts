import { IsEnum } from 'class-validator';
import { ReservationStatus } from 'src/common/enum/reservations.enum';

export class UpdateReservationStatusDto {
  @IsEnum(ReservationStatus)
  status: ReservationStatus;
}
