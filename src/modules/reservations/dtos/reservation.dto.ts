import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID, Matches } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    example: 'b1a2c3d4-e5f6-7890-abcd-123456789abc',
    description: 'ID de la actividad a reservar',
  })
  @IsUUID()
  activityId: string;

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
