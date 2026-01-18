import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID, Matches } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-123456789abc',
    description: 'ID of the turn to reserve',
  })
  @IsUUID()
  turnId: string;
}
