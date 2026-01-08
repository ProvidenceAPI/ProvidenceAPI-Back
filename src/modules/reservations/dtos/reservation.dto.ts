import { IsDateString, Matches } from 'class-validator';

export class CreateReservationDto {
  @IsDateString()
  activityDate: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'startTime must be HH:mm or HH:mm:ss',
  })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, {
    message: 'endTime must be HH:mm or HH:mm:ss',
  })
  endTime: string;
}
