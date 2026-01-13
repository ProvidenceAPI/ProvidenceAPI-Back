import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './entities/reservations.entity';
import { Repository } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { CreateReservationDto } from './dtos/reservation.dto';
import { Rol } from 'src/common/enum/roles.enum';
import { ReservationStatus } from 'src/common/enum/reservations.enum';
import { UserStatus } from 'src/common/enum/userStatus.enum';
import { Activity } from '../activities/entities/activity.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
  ) {}

  async createReservation(userId: string, dto: CreateReservationDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.status === UserStatus.banned) {
      throw new ForbiddenException('Your account is banned');
    }

    if (user.status === UserStatus.cancelled) {
      throw new ForbiddenException('Your account is cancelled');
    }

    const now = new Date();
    const reservationDate = new Date(`${dto.activityDate}T${dto.startTime}`);

    if (reservationDate < now) {
      throw new BadRequestException('Cannot reserve in the past');
    }

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Invalid time range');
    }

    const activityDate = new Date(dto.activityDate);
    const overlap = await this.reservationRepo.findOne({
      where: {
        activityDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: ReservationStatus.confirmed,
      },
    });

    if (overlap) {
      throw new ConflictException('Time slot already reserved');
    }

    const reservation = this.reservationRepo.create({
      ...dto,
      user,
    });
    return this.reservationRepo.save(reservation);
  }

  async cancelReservation(
    reservationId: string,
    requester: { id: string; rol: Rol },
  ) {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId },
      relations: ['user'],
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    if (reservation.status === ReservationStatus.cancelled) {
      throw new BadRequestException('Reservation already cancelled');
    }

    const isOwner = reservation.user.id === requester.id;
    const isAdmin =
      requester.rol === Rol.admin || requester.rol === Rol.superAdmin;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You cannot cancel this reservation');
    }
    reservation.status = ReservationStatus.cancelled;
    return this.reservationRepo.save(reservation);
  }

  async getMyReservations(userId: string) {
    return this.reservationRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllReservations() {
    return this.reservationRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async cancelAllActiveReservationsByUser(userId: string) {
    const activeReservations = await this.reservationRepo.find({
      where: {
        user: { id: userId },
        status: ReservationStatus.confirmed,
      },
    });
    for (const reservation of activeReservations) {
      reservation.status = ReservationStatus.cancelled;
    }
    await this.reservationRepo.save(activeReservations);
  }

  async findById(id: string) {
    const reservation = await this.reservationRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }
}
