import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { PaymentStatus } from 'src/common/enum/paymentStatus.enum';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly reservationsService: ReservationsService,
  ) {}

  async createPayment(userId: string, dto: CreatePaymentDto) {
    const reservation = await this.reservationsService.findById(
      dto.reservationId,
    );
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.user.id !== userId)
      throw new ForbiddenException('This reservation is not yours');
    if (reservation.paymentStatus === PaymentStatus.approved)
      throw new BadRequestException('Reservation already paid');

    const payment = this.paymentRepository.create({
      amount: dto.amount,
      reservation,
      user: { id: userId } as any,
      status: PaymentStatus.pending,
    });
    return this.paymentRepository.save(payment);
  }

  async updatePaymentStatus(paymentId: string, status: PaymentStatus) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    payment.status = status;
    return this.paymentRepository.save(payment);
  }
}
