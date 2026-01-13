import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservations.entity';
import { User } from '../users/entities/users.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { Activity } from '../activities/entities/activity.entity';
import { TurnsModule } from '../turns/turns.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, User, Activity]),
    TurnsModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
