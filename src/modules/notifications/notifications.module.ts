import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { User } from '../users/entities/users.entity';
import { Reservation } from '../reservations/entities/reservations.entity';
import { Payment } from '../payments/entities/payment.entity';
import { MailModule } from '../mail/mail.module';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Reservation, Payment]), MailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsSchedulerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
