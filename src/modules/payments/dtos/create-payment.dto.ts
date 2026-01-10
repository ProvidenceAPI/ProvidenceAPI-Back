import { IsUUID, IsNumber, IsPositive } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  reservationId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
