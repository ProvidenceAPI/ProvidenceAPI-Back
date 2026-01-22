import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Subscription } from './entities/subscriptions.entity';
import { SubscriptionStatus } from 'src/common/enum/subscriptionStatus.enum';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionsSchedulerService {
  private readonly logger = new Logger(SubscriptionsSchedulerService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 10 * * *', {
    name: 'subscription-expiry-reminders',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async sendSubscriptionExpiryReminders() {
    this.logger.log('⏰ Starting subscription expiry reminders...');

    try {
      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const expiringSubscriptions = await this.subscriptionRepository
        .createQueryBuilder('subscription')
        .leftJoinAndSelect('subscription.user', 'user')
        .leftJoinAndSelect('subscription.activity', 'activity')
        .where('subscription.status = :status', {
          status: SubscriptionStatus.active,
        })
        .andWhere('subscription.expirationDate BETWEEN :now AND :threeDays', {
          now,
          threeDays: threeDaysFromNow,
        })
        .getMany();

      this.logger.log(
        `📧 Found ${expiringSubscriptions.length} expiring subscriptions`,
      );

      let sent = 0;
      let failed = 0;

      for (const subscription of expiringSubscriptions) {
        try {
          const daysRemaining = Math.ceil(
            (subscription.expirationDate.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          await this.mailService.sendPaymentAlert(subscription.user.email, {
            userName: subscription.user.name,
            activityName: subscription.activity.name,
            amount: subscription.activity.price || 0,
            dueDate: subscription.expirationDate.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            paymentUrl: `${this.configService.get('FRONTEND_URL')}/subscriptions/${subscription.id}/renew`,
          });
          sent++;
        } catch (error) {
          this.logger.error(
            `❌ Failed to send expiry reminder to ${subscription.user.email}`,
            error.message,
          );
          failed++;
        }
      }

      this.logger.log(
        `✅ Subscription expiry reminders completed - Sent: ${sent}, Failed: ${failed}`,
      );
    } catch (error) {
      this.logger.error('❌ Subscription expiry reminders failed', error);
    }
  }

}
