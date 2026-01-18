import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionStatus } from 'src/common/enum/subscriptionStatus.enum';

export class SubscriptionResponseDto {
  @ApiProperty({
    example: 'a2b3c4d5-e6f7-8901-bcde-234567890def',
    description: 'Unique identifier for the subscription',
  })
  id: string;

  @ApiProperty({
    example: '2025-01-13T00:00:00.000Z',
    description: 'Start date of the subscription',
  })
  startDate: Date;

  @ApiProperty({
    example: '2025-02-13T00:00:00.000Z',
    description: 'Expiration date of the subscription',
  })
  expirationDate: Date;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.active })
  status: SubscriptionStatus;

  @ApiProperty({
    example: 25000.0,
    description: 'Monthly price of the subscription',
  })
  monthlyPrice: number;

  @ApiProperty({
    example: false,
    description: 'Indicates if the subscription is a free trial',
  })
  isFreeTrial: boolean;

  @ApiProperty({
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      image: { type: 'string' },
      price: { type: 'number' },
    },
  })
  activity: {
    id: string;
    name: string;
    image: string;
    price: number;
  };

  @ApiProperty({
    example: 15,
    description: 'Number of days remaining until subscription expiration',
    required: false,
  })
  daysRemaining?: number;
}
