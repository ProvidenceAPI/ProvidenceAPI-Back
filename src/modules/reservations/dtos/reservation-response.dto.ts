import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from 'src/common/enum/paymentStatus.enum';
import { ReservationStatus } from 'src/common/enum/reservations.enum';

export class ReservationResponseDto {
  @ApiProperty({
    example: '507ed3c9-6ee1-45aa-b075-0dc543321a88',
    description: 'Unique reservation identifier',
  })
  id: string;

  @ApiProperty({ example: '2025-02-15', description: 'Date of the activity' })
  activityDate: Date;

  @ApiProperty({ example: '14:00', description: 'Start time of the activity' })
  startTime: string;

  @ApiProperty({ example: '16:00', description: 'End time of the activity' })
  endTime: string;

  @ApiProperty({
    enum: ReservationStatus,
    description: 'Status of the reservation',
  })
  status: ReservationStatus;

  @ApiProperty({
    enum: PaymentStatus,
    description: 'Payment status of the reservation',
  })
  paymentStatus: PaymentStatus;

  @ApiProperty({
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      image: { type: 'string' },
      duration: { type: 'number' },
    },
  })
  activity: {
    id: string;
    name: string;
    image: string;
    duration: number;
  };

  @ApiProperty({
    example: '2025-01-08T18:30:00.000Z',
    description: 'Reservation creation timestamp',
  })
  createdAt: Date;
}
