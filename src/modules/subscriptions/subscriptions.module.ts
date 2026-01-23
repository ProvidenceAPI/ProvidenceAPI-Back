import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { Activity } from '../activities/entities/activity.entity';
import { Subscription } from './entities/subscriptions.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { MailModule } from '../mail/mail.module';
import { SubscriptionsSchedulerService } from './subscriptions-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, User, Activity]),
    MailModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsSchedulerService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
