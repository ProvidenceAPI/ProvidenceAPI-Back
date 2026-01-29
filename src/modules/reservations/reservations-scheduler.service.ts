import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../reservations/entities/reservations.entity';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { ReservationStatus } from 'src/common/enum/reservations.enum';

@Injectable()
export class ReservationsSchedulerService {
  private readonly logger = new Logger(ReservationsSchedulerService.name);

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('🚀 ReservationsSchedulerService LOADED');
  }

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

  @Cron('0 * * * *', {
    name: 'turn-reminders-3h-before',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async sendTurnReminders3HoursBefore() {
    this.logger.log('⏰ Starting turn reminders 3 hours before...');

    try {
      const now = new Date();
      const target = new Date(now);
      target.setHours(target.getHours() + 3);

      const targetDateStr = target.toISOString().split('T')[0]; // YYYY-MM-DD
      const targetTimeStr = target.toTimeString().slice(0, 5); // HH:MM

      const reservations = await this.reservationRepository
        .createQueryBuilder('reservation')
        .leftJoinAndSelect('reservation.user', 'user')
        .leftJoinAndSelect('reservation.turn', 'turn')
        .leftJoinAndSelect('turn.activity', 'activity')
        .where('reservation.status = :status', {
          status: ReservationStatus.confirmed,
        })
        .andWhere('reservation.activityDate = :date', {
          date: targetDateStr,
        })
        .andWhere('reservation.startTime = :time', {
          time: targetTimeStr,
        })
        .getMany();

      this.logger.log(
        `📧 Found ${reservations.length} reservations for 3h-before reminders`,
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
        } catch (error: any) {
          this.logger.error(
            `❌ Failed to send 3h-before reminder to ${reservation.user.email}`,
            error?.message || error,
          );
          failed++;
        }
      }

      this.logger.log(
        `✅ 3h-before turn reminders completed - Sent: ${sent}, Failed: ${failed}`,
      );
    } catch (error) {
      this.logger.error('❌ 3h-before turn reminders failed', error);
    }
  }

  private async completeYesterdayReservations(jobLabel: string) {
    this.logger.log(`⏰ [${jobLabel}] Starting completion of yesterday reservations...`);

    try {
      // Obtener la fecha de ayer en zona horaria de Buenos Aires
      // Usamos la fecha local actual y restamos un día
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Formatear como YYYY-MM-DD usando la fecha local (no UTC)
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${year}-${month}-${day}`;

      this.logger.log(
        `📅 [${jobLabel}] Marking reservations from ${yesterdayStr} as completed`,
      );

      const result = await this.reservationRepository
        .createQueryBuilder()
        .update(Reservation)
        .set({ status: ReservationStatus.completed })
        .where('status = :status', { status: ReservationStatus.confirmed })
        .andWhere('activityDate = :activityDate', { activityDate: yesterdayStr })
        .execute();

      this.logger.log(
        `✅ [${jobLabel}] Completed reservations update finished. Affected rows: ${result.affected ?? 0}`,
      );
    } catch (error: any) {
      this.logger.error(
        `❌ [${jobLabel}] Failed to complete yesterday reservations`,
        error?.message || error,
      );
    }
  }

  @Cron('0 14 * * *', {
    name: 'complete-yesterday-reservations-2pm',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async completeYesterdayAtNoon() {
    await this.completeYesterdayReservations('NOON');
  }

  @Cron('0 2 * * *', {
    name: 'complete-yesterday-reservations-2am',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async completeYesterdayAt2am() {
    await this.completeYesterdayReservations('2AM');
  }

  @Cron('*/15 * * * *', {
    name: 'complete-reservations-15min-after-start',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async completeReservations15MinutesAfterStart() {
    this.logger.log(
      '⏰ Starting completion of reservations 15 minutes after start time...',
    );

    try {
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

      const reservations = await this.reservationRepository
        .createQueryBuilder('reservation')
        .where('reservation.status = :status', {
          status: ReservationStatus.confirmed,
        })
        .getMany();

      let completed = 0;
      let skipped = 0;

      for (const reservation of reservations) {
        try {
          // Obtener la fecha como string YYYY-MM-DD usando fecha LOCAL (no UTC)
          let activityDateStr: string;
          if (reservation.activityDate instanceof Date) {
            // Usar métodos locales en lugar de toISOString() para evitar problemas de UTC
            const date = reservation.activityDate;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            activityDateStr = `${year}-${month}-${day}`;
          } else {
            // Si viene como string desde la BD, convertir a string explícitamente
            activityDateStr = String(reservation.activityDate).split('T')[0];
          }

          // Parsear la fecha correctamente (YYYY-MM-DD)
          const [year, month, day] = activityDateStr.split('-').map(Number);
          
          // Parsear la hora (HH:MM:SS o HH:MM)
          const [hours, minutes] = reservation.startTime.split(':').map(Number);

          // Crear la fecha/hora de la reserva en zona local (Buenos Aires)
          // Usamos el constructor que acepta año, mes (0-indexed), día, hora, minuto
          const reservationDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

          // Validación adicional: asegurarse de que la fecha parseada es válida
          if (isNaN(reservationDateTime.getTime())) {
            this.logger.warn(
              `⚠️ Invalid date for reservation ${reservation.id}: ${activityDateStr} ${reservation.startTime}`,
            );
            skipped++;
            continue;
          }

          // Comparar: solo marcar como completada si la reserva ya pasó (hace más de 15 minutos)
          // Usamos < en lugar de <= para ser más estricto
          const shouldComplete = reservationDateTime < fifteenMinutesAgo;
          
          if (shouldComplete) {
            reservation.status = ReservationStatus.completed;
            await this.reservationRepository.save(reservation);
            completed++;
            this.logger.log(
              `✅ Marked reservation ${reservation.id} as completed (started at ${activityDateStr} ${reservation.startTime}, datetime: ${reservationDateTime.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}, threshold: ${fifteenMinutesAgo.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })})`,
            );
          } else {
            skipped++;
            // Log detallado para debugging (solo para las primeras reservas)
            if (skipped <= 3) {
              this.logger.debug(
                `⏭️ Skipped reservation ${reservation.id} (not yet completed): ${activityDateStr} ${reservation.startTime}, datetime: ${reservationDateTime.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}, threshold: ${fifteenMinutesAgo.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`,
              );
            }
          }
        } catch (error: any) {
          this.logger.error(
            `❌ Error processing reservation ${reservation.id}:`,
            error?.message || error,
          );
        }
      }

      this.logger.log(
        `✅ Completed reservations 15min after start - Completed: ${completed}, Skipped: ${skipped}`,
      );
    } catch (error: any) {
      this.logger.error(
        '❌ Failed to complete reservations 15min after start',
        error?.message || error,
      );
    }
  }
}
