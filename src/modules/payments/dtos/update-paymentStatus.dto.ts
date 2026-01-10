import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PaymentStatus } from 'src/common/enum/paymentStatus.enum';

export class UpdatePaymentStatusDto {
  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.approved,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}
