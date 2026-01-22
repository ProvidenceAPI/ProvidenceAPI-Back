import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../reservations/entities/reservations.entity';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReservationsSchedulerService {
  private readonly logger = new Logger(ReservationsSchedulerService.name);

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 8 * * *', {
    name: 'turn-reminders',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async sendTurnReminders() {
    this.logger.log('⏰ Starting turn reminders...');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      const reservations = await this.reservationRepository
        .createQueryBuilder('reservation')
        .leftJoinAndSelect('reservation.user', 'user')
        .leftJoinAndSelect('reservation.turn', 'turn')
        .leftJoinAndSelect('turn.activity', 'activity')
        .where('reservation.activityDate BETWEEN :start AND :end', {
          start: tomorrow,
          end: endOfTomorrow,
        })
        .andWhere('reservation.status = :status', { status: 'confirmed' })
        .getMany();

      this.logger.log(
        `📧 Found ${reservations.length} reservations for tomorrow`,
      );

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
            frontendUrl:
              this.configService.get<string>('FRONTEND_URL') ||
              'http://localhost:3001',
          });
          sent++;
        } catch (error) {
          this.logger.error(
            `❌ Failed to send reminder to ${reservation.user.email}`,
            error.message,
          );
          failed++;
        }
      }

      this.logger.log(
        `✅ Turn reminders completed - Sent: ${sent}, Failed: ${failed}`,
      );
    } catch (error) {
      this.logger.error('❌ Turn reminders failed', error);
    }
  }
}
