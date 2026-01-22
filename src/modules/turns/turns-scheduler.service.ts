import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Turn, TurnStatus } from '../turns/entities/turn.entity';

@Injectable()
export class TurnsSchedulerService {
  private readonly logger = new Logger(TurnsSchedulerService.name);

  constructor(
    @InjectRepository(Turn)
    private readonly turnRepository: Repository<Turn>,
  ) {}

  // Cron jobs desactivados - se mantienen los métodos por si se necesitan manualmente
  // @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async markPastTurnsAsCompleted() {
    this.logger.log('Starting job: Mark past turns as completed');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await this.turnRepository
        .createQueryBuilder()
        .update(Turn)
        .set({ status: TurnStatus.completed })
        .where('date < :today', { today })
        .andWhere('status IN (:...statuses)', {
          statuses: [TurnStatus.available, TurnStatus.full],
        })
        .execute();

      this.logger.log(`✅ Marked ${result.affected} past turns as completed`);
    } catch (error) {
      this.logger.error('❌ Error marking past turns as completed', error);
    }
  }

  // @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async deleteOldCompletedTurns() {
    this.logger.log('Starting job: Delete old completed turns');

    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const result = await this.turnRepository.delete({
        date: LessThan(sixMonthsAgo),
        status: TurnStatus.completed,
      });

      this.logger.log(
        `🗑️ Deleted ${result.affected} old completed turns (>6 months)`,
      );
    } catch (error) {
      this.logger.error('❌ Error deleting old completed turns', error);
    }
  }
}
