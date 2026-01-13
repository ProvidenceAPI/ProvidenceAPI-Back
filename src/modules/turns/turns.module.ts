import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TurnsController } from './turns.controller';
import { TurnsService } from './turns.service';
import { Turn } from './entities/turn.entity';
import { Activity } from '../activities/entities/activity.entity';
import { TurnsSchedulerService } from './turns-scheduler.service';

@Module({
  imports: [TypeOrmModule.forFeature([Turn, Activity])],
  controllers: [TurnsController],
  providers: [TurnsService, TurnsSchedulerService],
  exports: [TurnsService, TypeOrmModule],
})
export class TurnsModule {}
