import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class AdminCreateReservationDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-123456789abc',
    description: 'ID of the turn to reserve',
  })
  @IsUUID()
  turnId: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-123456789abc',
    description: 'ID of the user to create the reservation for',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  userId?: string;
}

export class AssignReservationDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-123456789abc',
    description: 'ID of the user to assign the reservation to',
  })
  @IsUUID()
  userId: string;
}

export class ChangeReservationTurnDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-123456789abc',
    description: 'ID of the new turn to assign to the reservation',
  })
  @IsUUID()
  turnId: string;
}
