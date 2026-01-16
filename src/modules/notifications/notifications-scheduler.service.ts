import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { Reservation } from '../reservations/entities/reservations.entity';
import { Payment } from '../payments/entities/payment.entity';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { ReservationStatus } from 'src/common/enum/reservations.enum';
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

  @Cron('0 10 * * *', {
    name: 'turn-reminders',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async sendTurnReminders() {
    this.logger.log('⏰ Starting turn reminders job...');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const reservations = await this.reservationRepo.find({
        where: {
          activityDate: Between(tomorrow, dayAfterTomorrow),
          status: ReservationStatus.confirmed,
        },
        relations: ['user', 'turn', 'turn.activity'],
      });

      this.logger.log(`📧 Found ${reservations.length} reservations to remind`);

      let sent = 0;
      let failed = 0;

      for (const reservation of reservations) {
        try {
          await this.mailService.sendTurnReminder(reservation.user.email, {
            userName: reservation.user.name,
            activityName: reservation.turn.activity.name,
            turnDate: reservation.activityDate.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            turnTime: reservation.startTime,
            location: 'Provincia de Buenos Aires 760',
            frontendUrl: this.configService.get('FRONTEND_URL'),
          });
          sent++;
        } catch (error) {
          this.logger.error(
            `Failed to send reminder to ${reservation.user.email}`,
            error.message,
          );
          failed++;
        }
      }

      this.logger.log(
        `✅ Turn reminders completed - Sent: ${sent}, Failed: ${failed}`,
      );
    } catch (error) {
      this.logger.error('❌ Turn reminders job failed', error);
    }
  }

  @Cron('0 9 * * *', {
    name: 'payment-alerts',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  sendPaymentAlerts() {
    this.logger.log('⏰ Starting payment alerts job...');

    try {
      this.logger.warn(
        '⚠️ Payment alerts disabled - Payment entity needs dueDate field',
      );

      /*
      // Descomentar cuando Payment tenga dueDate
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
          'reservation',
          'reservation.user',
          'reservation.turn',
          'reservation.turn.activity',
        ],
      });

      this.logger.log(`📧 Found ${pendingPayments.length} pending payments to alert`);

      let sent = 0;
      let failed = 0;

      for (const payment of pendingPayments) {
        try {
          await this.mailService.sendPaymentAlert(
            payment.reservation.user.email,
            {
              userName: payment.reservation.user.name,
              activityName: payment.reservation.turn.activity.name,
              amount: payment.amount,
              dueDate: payment.dueDate.toLocaleDateString('es-ES'),
              paymentUrl: `${this.configService.get('FRONTEND_URL')}/mis-pagos`,
            },
          );
          sent++;
        } catch (error) {
          this.logger.error(
            `Failed to send payment alert to ${payment.reservation.user.email}`,
            error.message,
          );
          failed++;
        }
      }

      this.logger.log(`✅ Payment alerts completed - Sent: ${sent}, Failed: ${failed}`);
      */
    } catch (error) {
      this.logger.error('❌ Payment alerts job failed', error);
    }
  }

  @Cron('0 0 1 * *', {
    name: 'cleanup-notifications',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async cleanupOldNotifications(): Promise<void> {
    this.logger.log('🧹 Starting cleanup job...');

    try {
      await Promise.resolve();

      this.logger.log('✅ Cleanup completed');
    } catch (error) {
      this.logger.error('❌ Cleanup job failed', error);
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
      frontendUrl: this.configService.get('FRONTEND_URL'),
    });

    this.logger.log(`✅ Test reminder sent to ${reservation.user.email}`);
  }
}
