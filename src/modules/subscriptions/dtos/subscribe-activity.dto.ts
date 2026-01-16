import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsOptional } from 'class-validator';

export class SubscribeActivityDto {
  @ApiProperty({
    example: 'a2b3c4d5-e6f7-8901-bcde-234567890def',
    description: 'ID of the activity to subscribe to',
  })
  @IsUUID()
  activityId: string;

  @ApiProperty({
    example: true,
    description: 'Indicates whether to use a free trial if available',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  useFreeTrial?: boolean;
}
