import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Reservation } from '../reservations/entities/reservations.entity';
import { Payment } from '../payments/entities/payment.entity';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from 'src/common/enum/paymentStatus.enum';

@Injectable()
export class NotificationsSchedulerService {
  private readonly logger = new Logger(NotificationsSchedulerService.name);

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 9 * * *', {
    name: 'payment-alerts',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async sendPaymentAlerts() {
    this.logger.log('⏰ Starting payment alerts job...');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pendingPayments = await this.paymentRepo.find({
        where: {
          status: PaymentStatus.pending,
          dueDate: Between(today, tomorrow),
        },
        relations: [
          'user',
          'reservation',
          'reservation.turn',
          'reservation.turn.activity',
          'activity',
        ],
      });

      this.logger.log(
        `📧 Found ${pendingPayments.length} pending payments to alert`,
      );

      let sent = 0;
      let failed = 0;
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3001';

      for (const payment of pendingPayments) {
        try {
          const activityName =
            payment.reservation?.turn?.activity?.name ??
            payment.activity?.name ??
            'Suscripción';

          await this.mailService.sendPaymentAlert(payment.user.email, {
            userName: payment.user.name,
            activityName,
            amount: Number(payment.amount),
            dueDate: payment.dueDate!.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            paymentUrl: `${frontendUrl}/mis-pagos`,
          });
          sent++;
        } catch (error: any) {
          this.logger.error(
            `Failed to send payment alert to ${payment.user.email}`,
            error?.message ?? error,
          );
          failed++;
        }
      }

      this.logger.log(
        `✅ Payment alerts completed - Sent: ${sent}, Failed: ${failed}`,
      );
    } catch (error) {
      this.logger.error('❌ Payment alerts job failed', error);
    }
  }

  async sendTestReminder(reservationId: string): Promise<void> {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId },
      relations: ['user', 'turn', 'turn.activity'],
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    await this.mailService.sendTurnReminder(reservation.user.email, {
      userName: reservation.user.name,
      activityName: reservation.turn.activity.name,
      turnDate: reservation.activityDate.toLocaleDateString('es-ES'),
      turnTime: reservation.startTime,
      location: 'Provincia de Buenos Aires 760',
      frontendUrl:
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3001',
    });

    this.logger.log(`✅ Test reminder sent to ${reservation.user.email}`);
  }
}
