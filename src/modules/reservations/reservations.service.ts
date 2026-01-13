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
import { TurnsService } from '../turns/turns.service';
import { TurnStatus } from '../turns/entities/turn.entity';
// import { MailService } from '../mail/mail.service'; // ✅ Descomentar cuando implementes Nodemailer

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly turnsService: TurnsService,
    // private readonly mailService: MailService, // Descomentar cuando implementes Nodemailer
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

    const turn = await this.turnsService.findOne(dto.turnId);

    if (turn.status === TurnStatus.cancelled) {
      throw new BadRequestException('This turn has been cancelled');
    }

    if (turn.status === TurnStatus.completed) {
      throw new BadRequestException('This turn has already occurred');
    }

    if (turn.availableSpots <= 0) {
      throw new BadRequestException('No available spots for this turn');
    }

    const now = new Date();
    const turnDate =
      turn.date instanceof Date
        ? turn.date.toISOString().split('T')[0]
        : turn.date;
    const turnDateTime = new Date(`${turnDate}T${turn.startTime}`);

    if (turnDateTime < now) {
      throw new BadRequestException('Cannot reserve past turns');
    }

    const existingReservation = await this.reservationRepo.findOne({
      where: {
        user: { id: userId },
        turn: { id: dto.turnId },
        status: ReservationStatus.confirmed,
      },
    });

    if (existingReservation) {
      throw new ConflictException(
        'You already have a reservation for this turn',
      );
    }

    const reservation = this.reservationRepo.create({
      activityDate: turn.date,
      startTime: turn.startTime,
      endTime: turn.endTime,
      userId: user.id,
      turnId: dto.turnId,
      activityId: turn.activityId,
    });

    reservation.user = user;
    reservation.turn = turn;
    reservation.activity = turn.activity;

    const savedReservation = await this.reservationRepo.save(reservation);

    await this.turnsService.decrementAvailableSpots(dto.turnId);

    // ✅ TODO: Enviar email de confirmación
    // await this.mailService.sendReservationConfirmation(user, savedReservation);

    return savedReservation;
  }

  async cancelReservation(
    reservationId: string,
    requester: { id: string; rol: Rol },
  ) {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId },
      relations: ['user', 'turn'],
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

    if (isOwner && reservation.turn) {
      const now = new Date();
      const activityDate =
        reservation.activityDate instanceof Date
          ? reservation.activityDate.toISOString().split('T')[0]
          : reservation.activityDate;
      const turnDateTime = new Date(`${activityDate}T${reservation.startTime}`);

      const hoursUntilTurn =
        (turnDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      const activity = reservation.turn.activity;
      const cancellationTimeLimit = activity?.cancellationTime || 24;

      if (hoursUntilTurn < cancellationTimeLimit) {
        throw new BadRequestException(
          `You can only cancel ${cancellationTimeLimit} hours before the turn`,
        );
      }
    }

    reservation.status = ReservationStatus.cancelled;
    const cancelledReservation = await this.reservationRepo.save(reservation);

    if (reservation.turnId) {
      await this.turnsService.incrementAvailableSpots(reservation.turnId);
    }

    // ✅ TODO: Enviar email de cancelación
    // await this.mailService.sendReservationCancellation(
    //   reservation.user,
    //   cancelledReservation,
    // );

    return cancelledReservation;
  }

  async cancelTurnAndNotifyUsers(
    turnId: string,
    reason?: string,
  ): Promise<{ message: string; reservationsCancelled: number }> {
    const turn = await this.turnsService.findOne(turnId);

    if (turn.status === TurnStatus.cancelled) {
      throw new BadRequestException('Turn is already cancelled');
    }

    const activeReservations = await this.reservationRepo.find({
      where: {
        turnId: turnId,
        status: ReservationStatus.confirmed,
      },
      relations: ['user', 'turn'],
    });

    for (const reservation of activeReservations) {
      reservation.status = ReservationStatus.cancelled;

      // ✅ TODO: Enviar email de notificación a cada usuario
      // await this.mailService.sendTurnCancellationNotification(
      //   reservation.user,
      //   reservation,
      //   reason,
      // );
    }

    await this.reservationRepo.save(activeReservations);

    await this.turnsService.cancelTurn(turnId);

    return {
      message: `Turn cancelled successfully. ${activeReservations.length} users were notified.`,
      reservationsCancelled: activeReservations.length,
    };
  }

  async getMyReservations(userId: string) {
    return this.reservationRepo.find({
      where: { user: { id: userId } },
      relations: ['turn', 'activity'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllReservations() {
    return this.reservationRepo.find({
      relations: ['turn', 'activity', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async cancelAllActiveReservationsByUser(userId: string) {
    const activeReservations = await this.reservationRepo.find({
      where: {
        user: { id: userId },
        status: ReservationStatus.confirmed,
      },
      relations: ['turn'],
    });

    for (const reservation of activeReservations) {
      reservation.status = ReservationStatus.cancelled;

      if (reservation.turnId) {
        await this.turnsService.incrementAvailableSpots(reservation.turnId);
      }
    }

    await this.reservationRepo.save(activeReservations);
  }

  async findById(id: string) {
    const reservation = await this.reservationRepo.findOne({
      where: { id },
      relations: ['user', 'turn', 'activity'],
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }
}
