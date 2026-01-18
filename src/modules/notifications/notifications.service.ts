import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { SendNotificationDto } from './dtos/send-notification.dto';
import { UserStatus } from 'src/common/enum/userStatus.enum';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async sendNotificationToUser(
    userId: string,
    notification: SendNotificationDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.status !== UserStatus.active) {
      this.logger.warn(`User ${userId} is not active, skipping notification`);
      return;
    }

    await this.mailService.sendAdminNotification(user.email, {
      title: notification.title,
      message: notification.message || 'Sin mensaje',
      actionUrl: notification.actionUrl,
      actionText: notification.actionText || 'Ver más',
    });

    this.logger.log(`✅ Notification sent to user ${user.email}`);
  }

  async sendNotificationToAll(
    notification: SendNotificationDto,
  ): Promise<{ sent: number; failed: number }> {
    const users = await this.userRepository.find({
      where: { status: UserStatus.active },
    });

    this.logger.log(`📧 Sending notification to ${users.length} users...`);

    const emails = users.map((user) => user.email);

    try {
      await this.mailService.sendBulkEmails(emails, notification.title, {
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText || 'Ver más',
      });

      this.logger.log(`✅ Bulk notification sent to ${users.length} users`);

      return {
        sent: users.length,
        failed: 0,
      };
    } catch (error) {
      this.logger.error('Failed to send bulk notification', error);
      return {
        sent: 0,
        failed: users.length,
      };
    }
  }

  async sendNewActivityNotification(activityData: {
    name: string;
    description: string;
    instructor?: string;
    schedule: string;
  }): Promise<void> {
    const notification: SendNotificationDto = {
      title: '🎉 Nueva Actividad Disponible',
      message: `¡Tenemos una nueva actividad para ti!\n\n📋 ${activityData.name}\n\n${activityData.description}\n\n👤 Instructor: ${activityData.instructor || 'Por confirmar'}\n📅 Horarios: ${activityData.schedule}`,
      actionUrl: `${this.configService.get('FRONTEND_URL')}/activities`,
      actionText: 'Ver Actividades',
    };

    await this.sendNotificationToAll(notification);
  }

  async sendPromotionNotification(promotionData: {
    title: string;
    message: string;
    discount?: string;
    validUntil?: string;
  }): Promise<void> {
    const notification: SendNotificationDto = {
      title: `🎁 ${promotionData.title}`,
      message: `${promotionData.message}\n\n${promotionData.discount ? `💰 Descuento: ${promotionData.discount}` : ''}\n${promotionData.validUntil ? `⏰ Válido hasta: ${promotionData.validUntil}` : ''}`,
      actionUrl: `${this.configService.get('FRONTEND_URL')}/activities`,
      actionText: 'Aprovechar Promoción',
    };

    await this.sendNotificationToAll(notification);
  }

  async sendClosureNotification(closureData: {
    date: string;
    reason: string;
    reopenDate?: string;
  }): Promise<void> {
    const notification: SendNotificationDto = {
      title: '⚠️ Cierre Temporal',
      message: `Informamos que el gimnasio permanecerá cerrado:\n\n📅 Fecha: ${closureData.date}\n📝 Motivo: ${closureData.reason}\n\n${closureData.reopenDate ? `🔓 Reabrimos: ${closureData.reopenDate}` : 'Te avisaremos cuando reabramos.'}`,
      actionUrl: `${this.configService.get('FRONTEND_URL')}/activities`,
      actionText: 'Ver Calendario',
    };

    await this.sendNotificationToAll(notification);
  }

  async sendAnnouncementNotification(announcementData: {
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high';
  }): Promise<void> {
    const priorityEmoji = {
      low: 'ℹ️',
      medium: '📢',
      high: '⚠️',
    };

    const notification: SendNotificationDto = {
      title: `${priorityEmoji[announcementData.priority || 'medium']} ${announcementData.title}`,
      message: announcementData.message,
      actionUrl: `${this.configService.get('FRONTEND_URL')}`,
      actionText: 'Ir a Providence',
    };

    await this.sendNotificationToAll(notification);
  }
}
