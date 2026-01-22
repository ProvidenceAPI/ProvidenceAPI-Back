import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { Reservation } from '../reservations/entities/reservations.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Subscription } from '../subscriptions/entities/subscriptions.entity';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '../../common/enum/userStatus.enum';
import { Rol } from '../../common/enum/roles.enum';
import { PaymentStatus } from '../../common/enum/paymentStatus.enum';
import { ReservationStatus } from '../../common/enum/reservations.enum';
import {
  ARGENTINA_HOLIDAYS_2026,
  getHolidayByDate,
  getUpcomingHolidays,
} from './data/argentina-holidays';

@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async notifyNewActivity(data: {
    activityName: string;
    description: string;
    price: number;
    schedule: string;
  }) {
    const users = await this.usersRepository.find({
      where: { status: UserStatus.active },
    });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await this.mailService.sendAdminNotification(user.email, {
          title: '🎉 ¡Nueva Actividad Disponible!',
          message: `Estamos emocionados de anunciar nuestra nueva actividad: ${data.activityName}.\n\n${data.description}\n\nHorarios: ${data.schedule}\nPrecio: $${data.price}\n\n¡Reserva tu lugar ahora!`,
          actionUrl: `${this.configService.get('FRONTEND_URL')}/activities`,
          actionText: 'VER ACTIVIDADES',
        });
        sent++;
      } catch (error) {
        this.logger.error(`❌ Failed to send to ${user.email}:`, error.message);
        failed++;
      }
    }

    this.logger.log(
      `✅ New activity notifications - Sent: ${sent}, Failed: ${failed}`,
    );
    return { sent, failed, total: users.length };
  }

  async notifyHolidayClosure(data: {
    holidayDate: string;
    reopenDate?: string;
    customMessage?: string;
  }) {
    const holiday = getHolidayByDate(data.holidayDate);
    const holidayName = holiday ? holiday.name : 'Feriado';

    const users = await this.usersRepository.find({
      where: { status: UserStatus.active },
    });

    let sent = 0;
    let failed = 0;

    const reopenText = data.reopenDate
      ? `\n\nReabrimos: ${new Date(data.reopenDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
      : '';

    for (const user of users) {
      try {
        await this.mailService.sendAdminNotification(user.email, {
          title: `🏖️ Cierre por ${holidayName}`,
          message: `Te informamos que Providence Fitness estará cerrado el ${new Date(data.holidayDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} por ${holidayName}.${reopenText}\n\n${data.customMessage || 'Disculpa las molestias. ¡Feliz feriado!'}`,
          actionUrl: `${this.configService.get('FRONTEND_URL')}`,
          actionText: 'IR A PROVIDENCE',
        });
        sent++;
      } catch (error) {
        this.logger.error(`❌ Failed to send to ${user.email}:`, error.message);
        failed++;
      }
    }

    this.logger.log(
      `✅ Holiday closure notifications - Sent: ${sent}, Failed: ${failed}`,
    );
    return { sent, failed, total: users.length, holiday: holidayName };
  }

  async notifyPromotion(data: {
    title: string;
    description: string;
    discount?: string;
    validUntil?: string;
    actionUrl?: string;
  }) {
    const users = await this.usersRepository.find({
      where: { status: UserStatus.active },
    });

    let sent = 0;
    let failed = 0;

    const discountText = data.discount
      ? `\n\n🔥 Descuento: ${data.discount}`
      : '';
    const validText = data.validUntil
      ? `\n⏰ Válido hasta: ${new Date(data.validUntil).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
      : '';

    for (const user of users) {
      try {
        await this.mailService.sendAdminNotification(user.email, {
          title: `🎁 ${data.title}`,
          message: `${data.description}${discountText}${validText}\n\n¡No te pierdas esta oportunidad!`,
          actionUrl:
            data.actionUrl ||
            `${this.configService.get('FRONTEND_URL')}/activities`,
          actionText: 'VER PROMOCIÓN',
        });
        sent++;
      } catch (error) {
        this.logger.error(`❌ Failed to send to ${user.email}:`, error.message);
        failed++;
      }
    }

    this.logger.log(
      `✅ Promotion notifications - Sent: ${sent}, Failed: ${failed}`,
    );
    return { sent, failed, total: users.length };
  }

  async notifyImportantNotice(data: {
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
  }) {
    const users = await this.usersRepository.find({
      where: { status: UserStatus.active },
    });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await this.mailService.sendAdminNotification(user.email, {
          title: `📢 ${data.title}`,
          message: data.message,
          actionUrl:
            data.actionUrl || `${this.configService.get('FRONTEND_URL')}`,
          actionText: data.actionText || 'IR A PROVIDENCE',
        });
        sent++;
      } catch (error) {
        this.logger.error(`❌ Failed to send to ${user.email}:`, error.message);
        failed++;
      }
    }

    this.logger.log(
      `✅ Important notice notifications - Sent: ${sent}, Failed: ${failed}`,
    );
    return { sent, failed, total: users.length };
  }

  getUpcomingHolidays(daysAhead: number = 30) {
    return getUpcomingHolidays(daysAhead);
  }

  getAllHolidays() {
    return ARGENTINA_HOLIDAYS_2026;
  }

  @Cron('0 7 * * 1', {
    name: 'weekly-admin-report',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async sendWeeklyAdminReport() {
    this.logger.log('📊 Starting weekly admin report job...');

    try {
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);

      // Obtener administradores
      const admins = await this.usersRepository.find({
        where: [{ rol: Rol.admin }, { rol: Rol.superAdmin }],
      });

      if (admins.length === 0) {
        this.logger.warn('⚠️ No admins found to send weekly report');
        return;
      }

      // Estadísticas de la semana
      const newUsers = await this.usersRepository.count({
        where: {
          createdAt: MoreThanOrEqual(oneWeekAgo),
        },
      });

      const newReservations = await this.reservationRepository.count({
        where: {
          createdAt: MoreThanOrEqual(oneWeekAgo),
        },
      });

      const confirmedReservations = await this.reservationRepository.count({
        where: {
          createdAt: MoreThanOrEqual(oneWeekAgo),
          status: ReservationStatus.confirmed,
        },
      });

      const totalPayments = await this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.createdAt >= :oneWeekAgo', { oneWeekAgo })
        .getCount();

      const approvedPayments = await this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.createdAt >= :oneWeekAgo', { oneWeekAgo })
        .andWhere('payment.status = :status', {
          status: PaymentStatus.approved,
        })
        .getCount();

      const totalRevenue = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.createdAt >= :oneWeekAgo', { oneWeekAgo })
        .andWhere('payment.status = :status', {
          status: PaymentStatus.approved,
        })
        .getRawOne();

      const newSubscriptions = await this.subscriptionRepository.count({
        where: {
          startDate: MoreThanOrEqual(oneWeekAgo),
        },
      });

      const revenue = totalRevenue?.total || 0;
      const weekStart = oneWeekAgo.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const weekEnd = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const reportMessage = `📊 **Reporte Semanal - Providence Fitness**

**Período:** ${weekStart} al ${weekEnd}

**👥 Usuarios:**
• Nuevos usuarios: ${newUsers}

**📅 Reservas:**
• Total de reservas: ${newReservations}
• Reservas confirmadas: ${confirmedReservations}

**💳 Pagos:**
• Total de pagos: ${totalPayments}
• Pagos aprobados: ${approvedPayments}
• Ingresos totales: $${Number(revenue).toLocaleString('es-AR')}

**🎯 Suscripciones:**
• Nuevas suscripciones: ${newSubscriptions}

---
Este es un reporte automático generado cada lunes a las 7:00 AM.`;

      let sent = 0;
      let failed = 0;

      for (const admin of admins) {
        try {
          await this.mailService.sendAdminNotification(admin.email, {
            title: '📊 Reporte Semanal - Providence Fitness',
            message: reportMessage,
            actionUrl: `${this.configService.get('FRONTEND_URL')}/admin-dashboard`,
            actionText: 'VER DASHBOARD',
          });
          sent++;
        } catch (error) {
          this.logger.error(
            `❌ Failed to send weekly report to ${admin.email}`,
            error?.message ?? error,
          );
          failed++;
        }
      }

      this.logger.log(
        `✅ Weekly admin report completed - Sent: ${sent}, Failed: ${failed}`,
      );
    } catch (error) {
      this.logger.error('❌ Weekly admin report job failed', error);
    }
  }
}
