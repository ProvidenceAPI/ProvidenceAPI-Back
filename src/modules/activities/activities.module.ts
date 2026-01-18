import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailService } from '../mail/mail.service';
import { UserModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity]),
    FileUploadModule,
    NotificationsModule,
    UserModule,
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, MailService],
  exports: [ActivitiesService, TypeOrmModule],
})
export class ActivitiesModule {}
