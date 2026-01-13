import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Turn, TurnStatus } from './entities/turn.entity';
import { Activity } from '../activities/entities/activity.entity';
import { CreateTurnDto } from './dtos/create-turn.dto';
import { UpdateTurnDto } from './dtos/update-turn.dto';
import { GenerateTurnsDto } from './dtos/generate-turns.dto';
import { FilterTurnsDto } from './dtos/filter-turns.dto';

@Injectable()
export class TurnsService {
  constructor(
    @InjectRepository(Turn)
    private readonly turnRepository: Repository<Turn>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
  ) {}

  async generateTurns(dto: GenerateTurnsDto) {
    const activity = await this.activityRepository.findOne({
      where: { id: dto.activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.daysAhead
      ? new Date(startDate.getTime() + dto.daysAhead * 24 * 60 * 60 * 1000)
      : new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const turnsToCreate: Turn[] = [];
    const currentDate = new Date(startDate);

    const dayMap: { [key: string]: number } = {
      Domingo: 0,
      Lunes: 1,
      Martes: 2,
      Miércoles: 3,
      Jueves: 4,
      Viernes: 5,
      Sábado: 6,
    };

    const scheduleSlots = activity.schedule.map((slot) => {
      const [day, time] = slot.split(' ');
      return {
        dayOfWeek: dayMap[day],
        time: time,
      };
    });

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      const slotsForToday = scheduleSlots.filter(
        (slot) => slot.dayOfWeek === dayOfWeek,
      );

      for (const slot of slotsForToday) {
        const [hours, minutes] = slot.time.split(':');
        const startTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        const endTime = this.calculateEndTime(startTime, activity.duration);

        const existingTurn = await this.turnRepository.findOne({
          where: {
            activityId: activity.id,
            date: currentDate,
            startTime: startTime,
          },
        });

        if (!existingTurn) {
          const turn = this.turnRepository.create({
            activityId: activity.id,
            date: new Date(currentDate),
            startTime: startTime,
            endTime: endTime,
            capacity: activity.capacity,
            availableSpots: activity.capacity,
            isFreeTrial: activity.hasFreeTrial,
            status: TurnStatus.available,
          });

          turnsToCreate.push(turn);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (turnsToCreate.length === 0) {
      return {
        message: 'No new turns were generated (all already exist)',
        turnsCreated: 0,
      };
    }

    const savedTurns = await this.turnRepository.save(turnsToCreate);

    return {
      message: `${savedTurns.length} turns generated successfully`,
      turnsCreated: savedTurns.length,
      turns: savedTurns,
    };
  }

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + durationMinutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  }

  async createTurn(dto: CreateTurnDto): Promise<Turn> {
    const activity = await this.activityRepository.findOne({
      where: { id: dto.activityId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    const existingTurn = await this.turnRepository.findOne({
      where: {
        activityId: dto.activityId,
        date: new Date(dto.date),
        startTime: dto.startTime,
      },
    });

    if (existingTurn) {
      throw new ConflictException(
        'A turn already exists for this activity at this date and time',
      );
    }

    const capacity = dto.capacity || activity.capacity;

    const turn = this.turnRepository.create({
      activityId: dto.activityId,
      date: new Date(dto.date),
      startTime: dto.startTime,
      endTime: dto.endTime,
      capacity: capacity,
      availableSpots: capacity,
      isFreeTrial: dto.isFreeTrial ?? activity.hasFreeTrial,
      notes: dto.notes,
      status: TurnStatus.available,
    });

    return await this.turnRepository.save(turn);
  }

  async findAll(filterDto?: FilterTurnsDto) {
    try {
      const queryBuilder = this.turnRepository
        .createQueryBuilder('turn')
        .leftJoinAndSelect('turn.activity', 'activity')
        .leftJoinAndSelect('turn.reservations', 'reservations');

      if (filterDto?.activityId) {
        queryBuilder.andWhere('turn.activityId = :activityId', {
          activityId: filterDto.activityId,
        });
      }

      if (filterDto?.startDate) {
        queryBuilder.andWhere('turn.date >= :startDate', {
          startDate: filterDto.startDate,
        });
      }

      if (filterDto?.endDate) {
        queryBuilder.andWhere('turn.date <= :endDate', {
          endDate: filterDto.endDate,
        });
      }

      if (filterDto?.status) {
        queryBuilder.andWhere('turn.status = :status', {
          status: filterDto.status,
        });
      }

      if (filterDto?.onlyAvailable) {
        queryBuilder.andWhere('turn.availableSpots > 0');
        queryBuilder.andWhere('turn.status = :status', {
          status: TurnStatus.available,
        });
      }

      queryBuilder
        .orderBy('turn.date', 'ASC')
        .addOrderBy('turn.startTime', 'ASC');

      return await queryBuilder.getMany();
    } catch (error) {
      throw new InternalServerErrorException('Error fetching turns');
    }
  }

  async findOne(id: string): Promise<Turn> {
    const turn = await this.turnRepository.findOne({
      where: { id },
      relations: ['activity', 'reservations'],
    });

    if (!turn) {
      throw new NotFoundException(`Turn with ID "${id}" not found`);
    }

    return turn;
  }

  async update(id: string, dto: UpdateTurnDto): Promise<Turn> {
    const turn = await this.findOne(id);

    if (dto.startTime && dto.endTime && dto.startTime >= dto.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    if (dto.capacity !== undefined && dto.capacity !== turn.capacity) {
      const reservedSpots = turn.capacity - turn.availableSpots;
      const newAvailableSpots = dto.capacity - reservedSpots;

      if (newAvailableSpots < 0) {
        throw new BadRequestException(
          `Cannot reduce capacity below current reservations (${reservedSpots} spots reserved)`,
        );
      }

      turn.availableSpots = newAvailableSpots;
    }

    Object.assign(turn, dto);

    return await this.turnRepository.save(turn);
  }

  async cancelTurn(id: string): Promise<Turn> {
    const turn = await this.findOne(id);

    if (turn.status === TurnStatus.cancelled) {
      throw new BadRequestException('Turn is already cancelled');
    }

    turn.status = TurnStatus.cancelled;

    return await this.turnRepository.save(turn);
  }

  async remove(id: string): Promise<{ message: string }> {
    const turn = await this.findOne(id);

    if (turn.reservations && turn.reservations.length > 0) {
      throw new BadRequestException(
        'Cannot delete turn with existing reservations. Cancel the turn instead.',
      );
    }

    await this.turnRepository.remove(turn);

    return {
      message: 'Turn deleted successfully',
    };
  }

  async decrementAvailableSpots(turnId: string): Promise<void> {
    const turn = await this.findOne(turnId);

    if (turn.availableSpots <= 0) {
      throw new BadRequestException('No available spots for this turn');
    }

    turn.availableSpots -= 1;

    if (turn.availableSpots === 0) {
      turn.status = TurnStatus.full;
    }

    await this.turnRepository.save(turn);
  }

  async incrementAvailableSpots(turnId: string): Promise<void> {
    const turn = await this.findOne(turnId);

    if (turn.availableSpots >= turn.capacity) {
      throw new BadRequestException('Turn is already at full capacity');
    }

    turn.availableSpots += 1;

    if (turn.status === TurnStatus.full) {
      turn.status = TurnStatus.available;
    }

    await this.turnRepository.save(turn);
  }

  async getAvailableTurnsForActivity(
    activityId: string,
    startDate?: string,
  ): Promise<Turn[]> {
    const queryBuilder = this.turnRepository
      .createQueryBuilder('turn')
      .leftJoinAndSelect('turn.activity', 'activity')
      .where('turn.activityId = :activityId', { activityId })
      .andWhere('turn.status = :status', { status: TurnStatus.available })
      .andWhere('turn.availableSpots > 0');

    if (startDate) {
      queryBuilder.andWhere('turn.date >= :startDate', { startDate });
    } else {
      queryBuilder.andWhere('turn.date >= :today', {
        today: new Date().toISOString().split('T')[0],
      });
    }

    queryBuilder
      .orderBy('turn.date', 'ASC')
      .addOrderBy('turn.startTime', 'ASC');

    return await queryBuilder.getMany();
  }
}
