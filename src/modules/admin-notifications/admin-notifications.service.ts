import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from '../../common/enum/userStatus.enum';
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
}
