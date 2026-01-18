import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservations.entity';
import { User } from '../users/entities/users.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { Activity } from '../activities/entities/activity.entity';
import { TurnsModule } from '../turns/turns.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MailService } from '../mail/mail.service';
import { ReservationsSchedulerService } from './reservations-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, User, Activity]),
    TurnsModule,
    SubscriptionsModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, MailService, ReservationsSchedulerService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
