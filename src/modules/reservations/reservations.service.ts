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
import { TurnsService } from '../turns/turns.service';
import { TurnStatus } from '../turns/entities/turn.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    private readonly turnsService: TurnsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createReservation(userId: string, dto: CreateReservationDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status === UserStatus.banned)
      throw new ForbiddenException('Your account is banned');
    if (user.status === UserStatus.cancelled)
      throw new ForbiddenException('Your account is cancelled');

    const turn = await this.turnsService.findOne(dto.turnId);
    if (turn.status === TurnStatus.cancelled)
      throw new BadRequestException('This turn has been cancelled');
    if (turn.status === TurnStatus.completed)
      throw new BadRequestException('This turn has already occurred');
    if (turn.availableSpots <= 0)
      throw new BadRequestException('No available spots for this turn');

    const hasActiveSubscription =
      await this.subscriptionsService.checkSubscriptionStatus(
        userId,
        turn.activityId,
      );
    if (!hasActiveSubscription) {
      if (turn.isFreeTrial && turn.activity.hasFreeTrial) {
        const hasUsedFreeTrial =
          await this.subscriptionsService.hasUsedFreeTrial(userId);
        if (hasUsedFreeTrial)
          throw new ForbiddenException(
            'You have already used your free trial. Subscribe to continue booking classes.',
          );
      } else {
        throw new ForbiddenException(
          'You need an active subscription to book this activity. Please subscribe first.',
        );
      }
    }
    const now = new Date();
    const turnDate =
      turn.date instanceof Date
        ? turn.date.toISOString().split('T')[0]
        : turn.date;
    const turnDateTime = new Date(`${turnDate}T${turn.startTime}`);
    if (turnDateTime < now)
      throw new BadRequestException('Cannot reserve past turns');

    const existingReservation = await this.reservationRepo.findOne({
      where: {
        user: { id: userId },
        turn: { id: dto.turnId },
        status: ReservationStatus.confirmed,
      },
    });
    if (existingReservation)
      throw new ConflictException(
        'You already have a reservation for this turn',
      );

    const reservation = this.reservationRepo.create({
      activityDate: turn.date,
      startTime: turn.startTime,
      endTime: turn.endTime,
      userId: user.id,
      turnId: dto.turnId,
      activityId: turn.activityId,
      user,
      turn,
      activity: turn.activity,
    });

    const savedReservation = await this.reservationRepo.save(reservation);

    await this.turnsService.decrementAvailableSpots(dto.turnId);

    if (turn.isFreeTrial && !hasActiveSubscription) {
      await this.subscriptionsService.markFreeTrialAsUsed(
        userId,
        turn.activityId,
      );

      console.log(
        `✅ User ${userId} used their free trial on activity ${turn.activityId}`,
      );
    }

    try {
      await this.mailService.sendReservationConfirmation(user.email, {
        userName: user.name,
        activityName: turn.activity.name,
        turnDate: turn.date.toLocaleDateString('es-ES'),
        turnTime: turn.startTime,
        endTime: turn.endTime,
        instructor: 'Por asignar',
        location: 'Provincia de Buenos Aires 760',
        frontendUrl:
          this.configService.get<string>('FRONTEND_URL') ||
          'http://localhost:3001',
      });
    } catch (error) {
      console.error('Error sending reservation confirmation email:', error);
    }

    return savedReservation;
  }

  async cancelReservation(
    reservationId: string,
    requester: { id: string; rol: Rol },
  ) {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId },
      relations: ['user', 'turn', 'turn.activity'],
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
    await this.reservationRepo.save(reservation);

    if (reservation.turnId) {
      await this.turnsService.incrementAvailableSpots(reservation.turnId);
    }

    try {
      await this.mailService.sendReservationCancellation(
        reservation.user.email,
        {
          userName: reservation.user.name,
          activityName: reservation.turn.activity.name,
          turnDate: reservation.activityDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          turnTime: reservation.startTime,
          reason: isAdmin
            ? 'Cancelado por el administrador'
            : 'Cancelado por el usuario',
          refundInfo:
            'Puedes reprogramar tu clase sin costo adicional. Visita tu panel de reservas para elegir un nuevo turno.',
          frontendUrl:
            this.configService.get<string>('FRONTEND_URL') ||
            'http://localhost:3001',
        },
      );
    } catch (error) {
      console.error('❌ Error sending cancellation email:', error.message);
    }

    return { message: 'Reservation cancelled successfully' };
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
      relations: ['user', 'turn', 'turn.activity'],
    });

    for (const reservation of activeReservations) {
      reservation.status = ReservationStatus.cancelled;
    }

    await this.reservationRepo.save(activeReservations);

    await this.turnsService.cancelTurn(turnId);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const reservation of activeReservations) {
      try {
        await this.mailService.sendTurnCancellationNotification(
          reservation.user.email,
          {
            userName: reservation.user.name,
            activityName: reservation.turn.activity.name,
            turnDate: reservation.activityDate.toLocaleDateString('es-ES'),
            turnTime: reservation.startTime,
            reason: reason || 'Cancelación administrativa del turno',
            refundInfo:
              'Puedes reprogramar tu clase sin costo adicional. Tu suscripción permanece activa y puedes elegir otro turno disponible.',
          },
        );
        emailsSent++;
      } catch (error) {
        console.error(
          `Error sending turn cancellation email to ${reservation.user.email}:`,
          error,
        );
        emailsFailed++;
      }
    }

    console.log(
      `Turn ${turnId} cancelled. Emails sent: ${emailsSent}, failed: ${emailsFailed}`,
    );

    return {
      message: `Turn cancelled successfully. ${activeReservations.length} users were notified (${emailsSent} emails sent, ${emailsFailed} failed).`,
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
