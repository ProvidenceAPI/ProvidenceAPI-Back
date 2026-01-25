import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity, ActivityStatus } from './entities/activity.entity';
import { CreateActivityDto } from './dtos/create-activity.dto';
import { UpdateActivityDto } from './dtos/update-activity.dto';
import { FilterActivityDto } from './dtos/filter-activity.dto';
import { FileUploadService } from '../file-upload/file-upload.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { ReservationStatus } from 'src/common/enum/reservations.enum';
import { TurnStatus } from '../turns/entities/turn.entity';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    private readonly fileUploadService: FileUploadService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async create(createActivityDto: CreateActivityDto): Promise<Activity> {
    try {
      const existingActivity = await this.activityRepository.findOne({
        where: { name: createActivityDto.name },
      });
      if (existingActivity) {
        throw new BadRequestException(
          `Activity with name "${createActivityDto.name}" already exists`,
        );
      }
      const newActivity = this.activityRepository.create(createActivityDto);
      const savedActivity = await this.activityRepository.save(newActivity);

      this.sendNewActivityEmails(savedActivity).catch((err) =>
        console.error('Background email error:', err),
      );
      return savedActivity;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Error creating activity');
    }
  }
  private async sendNewActivityEmails(activity: Activity): Promise<void> {
    try {
      const users = await this.usersService.findAllActive();

      await Promise.all(
        users.map((user) =>
          this.mailService
            .sendAdminNotification(user.email, {
              title: '¡Nueva Actividad Disponible! 🎉',
              message: `Estamos emocionados de anunciar nuestra nueva actividad: ${activity.name}.\n\n${activity.description}\n\nHorarios: ${activity.schedule.join(', ')}\nPrecio: $${activity.price}`,
              actionUrl: `${this.configService.get('FRONTEND_URL')}/activities/${activity.id}`,
              actionText: 'VER ACTIVIDAD',
            })
            .catch((err) =>
              console.error(`Error enviando email a ${user.email}:`, err),
            ),
        ),
      );
    } catch (error) {
      console.error('Error in background email sending:', error.message);
    }
  }

  async findAll(filterDto?: FilterActivityDto) {
    try {
      const {
        status,
        name,
        minPrice,
        maxPrice,
        hasFreeTrial,
        page = 1,
        limit = 10,
      } = filterDto || {};

      const queryBuilder =
        this.activityRepository.createQueryBuilder('activity');
      if (status) {
        queryBuilder.andWhere('activity.status = :status', { status });
      }
      if (name) {
        queryBuilder.andWhere('activity.name ILIKE :name', {
          name: `%${name}%`,
        });
      }
      if (minPrice !== undefined && maxPrice !== undefined) {
        queryBuilder.andWhere(
          'activity.price BETWEEN :minPrice AND :maxPrice',
          {
            minPrice,
            maxPrice,
          },
        );
      } else if (minPrice !== undefined) {
        queryBuilder.andWhere('activity.price >= :minPrice', { minPrice });
      } else if (maxPrice !== undefined) {
        queryBuilder.andWhere('activity.price <= :maxPrice', { maxPrice });
      }
      if (hasFreeTrial !== undefined) {
        queryBuilder.andWhere('activity.hasFreeTrial = :hasFreeTrial', {
          hasFreeTrial,
        });
      }
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);
      queryBuilder.orderBy('activity.createdAt', 'DESC');
      const [activities, total] = await queryBuilder.getManyAndCount();

      return {
        data: activities,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Error fetching activities');
    }
  }

  async findOne(id: string): Promise<Activity> {
    try {
      const activity = await this.activityRepository.findOne({
        where: { id },
      });
      if (!activity) {
        throw new NotFoundException(`Activity with ID "${id}" not found`);
      }
      return activity;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error fetching activity');
    }
  }

  async update(
    id: string,
    updateActivityDto: UpdateActivityDto,
  ): Promise<Activity> {
    try {
      const activity = await this.findOne(id);
      if (updateActivityDto.name && updateActivityDto.name !== activity.name) {
        const existingActivity = await this.activityRepository.findOne({
          where: { name: updateActivityDto.name },
        });
        if (existingActivity) {
          throw new BadRequestException(
            `Activity with name "${updateActivityDto.name}" already exists`,
          );
        }
      }
      await this.activityRepository.update(id, updateActivityDto);
      return await this.findOne(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException('Error updating activity');
    }
  }

  async updateActivityImage(
    activityId: string,
    file?: Express.Multer.File,
    imageUrl?: string,
  ): Promise<Activity> {
    try {
      const activity = await this.findOne(activityId);
      let finalUrl: string;
      if (file) {
        finalUrl = await this.fileUploadService.uploadImage(file, 'activities');
      } else if (imageUrl) {
        finalUrl = imageUrl;
      } else {
        throw new BadRequestException(
          'Either file or imageUrl must be provided',
        );
      }
      activity.image = finalUrl;
      return await this.activityRepository.save(activity);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException('Error updating activity image');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: ['turns', 'turns.reservations', 'turns.reservations.user'],
    });
    if (!activity) {
      throw new NotFoundException(`Activity with ID "${id}" not found`);
    }
    const affectedUsers = new Set<{ email: string; name: string }>();
    const now = new Date();

    for (const turn of activity.turns || []) {
      const turnDate =
        turn.date instanceof Date ? turn.date : new Date(turn.date);
      const turnDateTime = new Date(
        `${turnDate.toISOString().split('T')[0]}T${turn.startTime}`,
      );
      if (turnDateTime > now) {
        for (const reservation of turn.reservations || []) {
          if (reservation.status === ReservationStatus.confirmed) {
            affectedUsers.add({
              email: reservation.user.email,
              name: reservation.user.name,
            });
          }
        }
      }
    }
    await this.activityRepository.remove(activity);
    this.notifyUsersActivityDeleted(
      Array.from(affectedUsers),
      activity.name,
    ).catch((err) => console.error('Background email error:', err));
    return {
      message: `Activity "${activity.name}" has been deleted successfully`,
    };
  }

  async toggleStatus(id: string): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: ['turns', 'turns.reservations', 'turns.reservations.user'],
    });
    if (!activity) {
      throw new NotFoundException(`Activity with ID "${id}" not found`);
    }
    const newStatus =
      activity.status === ActivityStatus.active
        ? ActivityStatus.inactive
        : ActivityStatus.active;
    if (newStatus === ActivityStatus.inactive) {
      const affectedUsers = new Set<{ email: string; name: string }>();
      const now = new Date();

      for (const turn of activity.turns || []) {
        const turnDate =
          turn.date instanceof Date ? turn.date : new Date(turn.date);
        const turnDateTime = new Date(
          `${turnDate.toISOString().split('T')[0]}T${turn.startTime}`,
        );
        if (turnDateTime > now && turn.status !== TurnStatus.cancelled) {
          turn.status = TurnStatus.cancelled;
          await this.activityRepository.manager.save(turn);

          for (const reservation of turn.reservations || []) {
            if (reservation.status === ReservationStatus.confirmed) {
              reservation.status = ReservationStatus.cancelled;
              await this.activityRepository.manager.save(reservation);
              affectedUsers.add({
                email: reservation.user.email,
                name: reservation.user.name,
              });
            }
          }
        }
      }
      if (affectedUsers.size > 0) {
        this.notifyUsersActivityInactivated(
          Array.from(affectedUsers),
          activity.name,
        ).catch((err) => console.error('Background email error:', err));
      }
    }
    await this.activityRepository.update(id, { status: newStatus });
    return await this.findOne(id);
  }

  async getActiveActivities() {
    try {
      return await this.activityRepository.find({
        where: { status: ActivityStatus.active },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Error fetching active activities',
      );
    }
  }

  private async notifyUsersActivityDeleted(
    users: Array<{ email: string; name: string }>,
    activityName: string,
  ): Promise<void> {
    try {
      await Promise.all(
        users.map((user) =>
          this.mailService
            .sendAdminNotification(user.email, {
              title: '⚠️ Actividad Cancelada',
              message: `Lamentamos informarte que la actividad "${activityName}" ha sido eliminada.\n\nTodas tus reservas futuras para esta actividad han sido canceladas automáticamente.\n\nPuedes explorar nuestras otras actividades disponibles.`,
              actionUrl: `${this.configService.get('FRONTEND_URL')}/activities`,
              actionText: 'VER ACTIVIDADES',
            })
            .catch((err) =>
              console.error(`Error enviando email a ${user.email}:`, err),
            ),
        ),
      );
    } catch (error) {
      console.error('Error in background email sending:', error.message);
    }
  }
  private async notifyUsersActivityInactivated(
    users: Array<{ email: string; name: string }>,
    activityName: string,
  ): Promise<void> {
    try {
      await Promise.all(
        users.map((user) =>
          this.mailService
            .sendAdminNotification(user.email, {
              title: '⏸️ Actividad Temporalmente Suspendida',
              message: `La actividad "${activityName}" ha sido temporalmente suspendida.\n\nTus reservas futuras para esta actividad han sido canceladas.\n\nTe notificaremos cuando la actividad vuelva a estar disponible.`,
              actionUrl: `${this.configService.get('FRONTEND_URL')}/activities`,
              actionText: 'VER OTRAS ACTIVIDADES',
            })
            .catch((err) =>
              console.error(`Error enviando email a ${user.email}:`, err),
            ),
        ),
      );
    } catch (error) {
      console.error('Error in background email sending:', error.message);
    }
  }
}
