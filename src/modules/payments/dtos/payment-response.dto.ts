import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({
    example: 'b3e1f7a6-8c2f-4b1e-9f6d-123456789abc',
    description: 'Payment ID',
  })
  paymentId: string;

  @ApiProperty({
    example:
      'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=abc123',
    description: 'URL of MercadoPago to complete the payment',
  })
  initPoint: string;

  @ApiProperty({
    example: 25000.0,
    description: 'Amount to be paid',
  })
  amount: number;

  @ApiProperty({
    example: 'pending',
    description: 'Payment status',
  })
  status: string;
}
