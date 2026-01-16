import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RenewSubscriptionDto {
  @ApiProperty({
    example: 'c3d4e5f6-g7h8-9012-cdef-345678901efg',
    description: 'ID de la suscripción a renovar',
  })
  @IsUUID()
  subscriptionId: string;
}
