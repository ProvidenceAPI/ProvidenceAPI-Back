import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
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
import {
  Activity,
  ActivityStatus,
} from '../activities/entities/activity.entity';
import { TurnsService } from '../turns/turns.service';
import { TurnStatus } from '../turns/entities/turn.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

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
    if (turn.activity.status === ActivityStatus.inactive) {
      throw new BadRequestException(
        'Cannot reserve turns for inactive activities',
      );
    }
    if (turn.status === TurnStatus.cancelled)
      throw new BadRequestException('This turn has been cancelled');
    if (turn.status === TurnStatus.completed)
      throw new BadRequestException('This turn has already occurred');
    if (turn.availableSpots <= 0)
      throw new BadRequestException('No available spots for this turn');
    const now = new Date();
    const turnDate =
      turn.date instanceof Date
        ? turn.date.toISOString().split('T')[0]
        : turn.date;
    const turnDateTime = new Date(`${turnDate}T${turn.startTime}`);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    if (turnDateTime < oneHourFromNow) {
      const minutesRemaining = Math.floor(
        (turnDateTime.getTime() - now.getTime()) / (60 * 1000),
      );
      throw new BadRequestException(
        `Debes reservar con al menos 1 hora de anticipación. Este turno comienza en ${minutesRemaining} minutos.`,
      );
    }
    const hasActiveSubscription =
      await this.subscriptionsService.checkSubscriptionStatus(
        userId,
        turn.activityId,
      );
    if (!hasActiveSubscription) {
      if (!turn.isFreeTrial) {
        throw new ForbiddenException(
          'You need an active subscription to book this activity. Please subscribe first.',
        );
      }
      if (!turn.activity.hasFreeTrial) {
        throw new ForbiddenException(
          'This activity does not offer free trials. Please subscribe first.',
        );
      }
      const hasUsedFreeTrial =
        await this.subscriptionsService.hasUsedFreeTrial(userId);
      if (hasUsedFreeTrial)
        throw new ForbiddenException(
          'You have already used your free trial. Subscribe to continue booking classes.',
        );
    }
    const reservationDate = turnDate;
    const existingReservationSameDay = await this.reservationRepo.findOne({
      where: {
        user: { id: userId },
        activityId: turn.activityId,
        activityDate: new Date(reservationDate),
        status: ReservationStatus.confirmed,
      },
    });
    if (existingReservationSameDay) {
      throw new ConflictException(
        'You already have a reservation for this activity today. Only one reservation per day per activity is allowed.',
      );
    }

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
      isFreeTrial: !hasActiveSubscription && turn.isFreeTrial,
      user,
      turn,
      activity: turn.activity,
    });
    const savedReservation = await this.reservationRepo.save(reservation);
    await this.turnsService.decrementAvailableSpots(dto.turnId);
    if (!hasActiveSubscription && turn.isFreeTrial) {
      await this.subscriptionsService.markFreeTrialAsUsed(
        userId,
        turn.activityId,
      );
    }
    try {
      // Asegurar que turn.date sea un Date antes de formatear
      const turnDate = turn.date instanceof Date 
        ? turn.date 
        : new Date(turn.date);
      
      this.logger.log(
        `📧 Enviando correo de confirmación de reserva a ${user.email} para actividad ${turn.activity.name}`,
      );
      
      await this.mailService.sendReservationConfirmation(user.email, {
        userName: user.name,
        activityName: turn.activity.name,
        turnDate: turnDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        turnTime: turn.startTime,
        endTime: turn.endTime,
        instructor: 'Por asignar',
        location: 'Provincia de Buenos Aires 760',
        frontendUrl:
          this.configService.get<string>('FRONTEND_URL') ||
          'http://localhost:3001',
      });
      
      this.logger.log(
        `✅ Correo de confirmación enviado exitosamente a ${user.email}`,
      );
    } catch (error: any) {
      this.logger.error(
        `❌ Error al enviar correo de confirmación de reserva a ${user.email}:`,
        error?.message || error,
        error?.stack,
      );
      // No lanzamos el error para que la reserva se cree aunque falle el correo
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
      const activityDate = reservation.activityDate instanceof Date
        ? reservation.activityDate
        : new Date(reservation.activityDate);

      this.logger.log(
        `📧 Enviando correo de cancelación de reserva a ${reservation.user.email}`,
      );

      await this.mailService.sendReservationCancellation(
        reservation.user.email,
        {
          userName: reservation.user.name,
          activityName: reservation.turn.activity.name,
          turnDate: activityDate.toLocaleDateString('es-ES', {
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

      this.logger.log(
        `✅ Correo de cancelación enviado exitosamente a ${reservation.user.email}`,
      );
    } catch (error: any) {
      this.logger.error(
        `❌ Error al enviar correo de cancelación a ${reservation.user.email}:`,
        error?.message || error,
        error?.stack,
      );
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
        const activityDate = reservation.activityDate instanceof Date
          ? reservation.activityDate
          : new Date(reservation.activityDate);

        this.logger.log(
          `📧 Enviando notificación de turno cancelado a ${reservation.user.email}`,
        );

        await this.mailService.sendTurnCancellationNotification(
          reservation.user.email,
          {
            userName: reservation.user.name,
            activityName: reservation.turn.activity.name,
            turnDate: activityDate.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            turnTime: reservation.startTime,
            reason: reason || 'Cancelación administrativa del turno',
            refundInfo:
              'Puedes reprogramar tu clase sin costo adicional. Tu suscripción permanece activa y puedes elegir otro turno disponible.',
            frontendUrl:
              this.configService.get<string>('FRONTEND_URL') ||
              'http://localhost:3001',
          },
        );

        this.logger.log(
          `✅ Notificación de turno cancelado enviada a ${reservation.user.email}`,
        );
        emailsSent++;
      } catch (error: any) {
        this.logger.error(
          `❌ Error al enviar notificación de turno cancelado a ${reservation.user.email}:`,
          error?.message || error,
          error?.stack,
        );
        emailsFailed++;
      }
    }
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

  async getReservationCancellationRate() {
    const [total, cancelled, completed] = await Promise.all([
      this.reservationRepo.count(),
      this.reservationRepo.count({
        where: { status: ReservationStatus.cancelled },
      }),
      this.reservationRepo.count({
        where: { status: ReservationStatus.completed },
      }),
    ]);
    const cancellationRate =
      total > 0 ? parseFloat(((cancelled / total) * 100).toFixed(2)) : 0;
    const completionRate =
      total > 0 ? parseFloat(((completed / total) * 100).toFixed(2)) : 0;
    return {
      total,
      cancelled,
      completed,
      cancellationRate,
      completionRate,
    };
  }

  async getActivityAttendanceStats() {
    const attendanceByActivity = await this.reservationRepo
      .createQueryBuilder('res')
      .select('activity.id', 'activityId')
      .addSelect('activity.name', 'activityName')
      .addSelect(
        'COUNT(CASE WHEN res.status = :completed THEN 1 END)',
        'completed',
      )
      .addSelect(
        'COUNT(CASE WHEN res.status = :cancelled THEN 1 END)',
        'cancelled',
      )
      .addSelect('COUNT(*)', 'total')
      .leftJoin('res.activity', 'activity')
      .setParameter('completed', ReservationStatus.completed)
      .setParameter('cancelled', ReservationStatus.cancelled)
      .groupBy('activity.id')
      .addGroupBy('activity.name')
      .getRawMany();

    return attendanceByActivity.map((item) => ({
      activityId: item.activityId,
      activityName: item.activityName,
      totalReservations: parseInt(item.total),
      completed: parseInt(item.completed),
      cancelled: parseInt(item.cancelled),
      attendanceRate:
        item.total > 0
          ? parseFloat(((item.completed / item.total) * 100).toFixed(2))
          : 0,
    }));
  }

  async getPeakHours() {
    const peakHours = await this.reservationRepo
      .createQueryBuilder('res')
      .select('res.startTime', 'hour')
      .addSelect('COUNT(res.id)', 'count')
      .where('res.status = :confirmed', {
        confirmed: ReservationStatus.confirmed,
      })
      .orWhere('res.status = :completed', {
        completed: ReservationStatus.completed,
      })
      .groupBy('res.startTime')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();
    return peakHours.map((item) => ({
      hour: item.hour,
      reservations: parseInt(item.count),
    }));
  }

  async assignReservationToUser(
    reservationId: string,
    userId: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId },
      relations: ['user', 'turn', 'activity'],
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const newUser = await this.userRepository.findOne({ where: { id: userId } });
    if (!newUser) {
      throw new NotFoundException('User not found');
    }

    if (newUser.status === UserStatus.banned) {
      throw new ForbiddenException('Cannot assign reservation to banned user');
    }

    if (newUser.status === UserStatus.cancelled) {
      throw new ForbiddenException('Cannot assign reservation to cancelled user');
    }

    // Verificar que el nuevo usuario no tenga ya una reserva para este turno
    const existingReservation = await this.reservationRepo.findOne({
      where: {
        turnId: reservation.turnId,
        user: { id: userId },
        status: ReservationStatus.confirmed,
      },
    });

    if (existingReservation && existingReservation.id !== reservationId) {
      throw new ConflictException(
        'User already has a reservation for this turn',
      );
    }

    const oldUser = reservation.user;
    reservation.user = newUser;

    const updatedReservation = await this.reservationRepo.save(reservation);

    // Enviar email de confirmación al nuevo usuario
    try {
      const activityDate = reservation.activityDate instanceof Date
        ? reservation.activityDate
        : new Date(reservation.activityDate);
      
      this.logger.log(
        `📧 Enviando correo de confirmación de reserva reasignada a ${newUser.email}`,
      );
      
      await this.mailService.sendReservationConfirmation(newUser.email, {
        userName: newUser.name,
        activityName: reservation.turn.activity.name,
        turnDate: activityDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        turnTime: reservation.startTime,
        endTime: reservation.turn.endTime,
        instructor: 'Por asignar',
        location: 'Provincia de Buenos Aires 760',
        frontendUrl:
          this.configService.get<string>('FRONTEND_URL') ||
          'http://localhost:3001',
      });
      
      this.logger.log(
        `✅ Correo de confirmación enviado exitosamente a ${newUser.email}`,
      );
    } catch (error: any) {
      this.logger.error(
        `❌ Error al enviar correo de confirmación de reserva reasignada a ${newUser.email}:`,
        error?.message || error,
        error?.stack,
      );
    }

    // Notificar al usuario anterior si es diferente
    if (oldUser.id !== newUser.id) {
      try {
        const activityDate = reservation.activityDate instanceof Date
          ? reservation.activityDate
          : new Date(reservation.activityDate);
        
        this.logger.log(
          `📧 Enviando correo de cancelación de reserva reasignada a ${oldUser.email}`,
        );
        
        await this.mailService.sendReservationCancellation(oldUser.email, {
          userName: oldUser.name,
          activityName: reservation.turn.activity.name,
          turnDate: activityDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          turnTime: reservation.startTime,
          reason: 'Reserva reasignada por el administrador',
          refundInfo:
            'Esta reserva ha sido reasignada a otro usuario por el administrador.',
          frontendUrl:
            this.configService.get<string>('FRONTEND_URL') ||
            'http://localhost:3001',
        });
        
        this.logger.log(
          `✅ Correo de cancelación enviado exitosamente a ${oldUser.email}`,
        );
      } catch (error: any) {
        this.logger.error(
          `❌ Error al enviar correo de cancelación de reserva reasignada a ${oldUser.email}:`,
          error?.message || error,
          error?.stack,
        );
      }
    }

    return updatedReservation;
  }

  async changeReservationTurn(
    reservationId: string,
    newTurnId: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId },
      relations: ['user', 'turn', 'turn.activity', 'activity'],
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status === ReservationStatus.cancelled) {
      throw new BadRequestException('Cannot change turn of a cancelled reservation');
    }

    const newTurn = await this.turnsService.findOne(newTurnId);
    
    if (!newTurn) {
      throw new NotFoundException('Turn not found');
    }

    if (newTurn.status === TurnStatus.cancelled) {
      throw new BadRequestException('Cannot assign reservation to a cancelled turn');
    }

    if (newTurn.status === TurnStatus.completed) {
      throw new BadRequestException('Cannot assign reservation to a completed turn');
    }

    if (newTurn.availableSpots <= 0) {
      throw new BadRequestException('No available spots for this turn');
    }

    // Verificar que el usuario no tenga ya una reserva para este nuevo turno
    const existingReservation = await this.reservationRepo.findOne({
      where: {
        turnId: newTurnId,
        user: { id: reservation.user.id },
        status: ReservationStatus.confirmed,
      },
    });

    if (existingReservation && existingReservation.id !== reservationId) {
      throw new ConflictException(
        'User already has a reservation for this turn',
      );
    }

    const oldTurn = reservation.turn;
    const oldActivityName = oldTurn?.activity?.name || reservation.activity?.name || 'Actividad anterior';

    // Liberar el cupo del turno anterior
    if (oldTurn) {
      await this.turnsService.incrementAvailableSpots(oldTurn.id);
    }

    // Actualizar la reserva con el nuevo turno
    reservation.turnId = newTurnId;
    reservation.turn = newTurn;
    reservation.activityId = newTurn.activityId;
    // Asegurar que activityDate sea un Date
    reservation.activityDate =
      newTurn.date instanceof Date
        ? newTurn.date
        : new Date(newTurn.date);
    reservation.startTime = newTurn.startTime;
    reservation.endTime = newTurn.endTime;

    // Reservar el cupo en el nuevo turno
    await this.turnsService.decrementAvailableSpots(newTurnId);

    const updatedReservation = await this.reservationRepo.save(reservation);

    // Enviar email de confirmación con la nueva actividad
    try {
      const newTurnDate =
        newTurn.date instanceof Date
          ? newTurn.date
          : new Date(newTurn.date);
      
      this.logger.log(
        `📧 Enviando correo de confirmación de cambio de turno a ${reservation.user.email}`,
      );
      
      await this.mailService.sendReservationConfirmation(reservation.user.email, {
        userName: reservation.user.name,
        activityName: newTurn.activity.name,
        turnDate: newTurnDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        turnTime: newTurn.startTime,
        endTime: newTurn.endTime,
        instructor: 'Por asignar',
        location: 'Provincia de Buenos Aires 760',
        frontendUrl:
          this.configService.get<string>('FRONTEND_URL') ||
          'http://localhost:3001',
      });
      
      this.logger.log(
        `✅ Correo de confirmación de cambio de turno enviado exitosamente a ${reservation.user.email}`,
      );
    } catch (error: any) {
      this.logger.error(
        `❌ Error al enviar correo de confirmación de cambio de turno a ${reservation.user.email}:`,
        error?.message || error,
        error?.stack,
      );
    }

    // Enviar email de cancelación para la actividad anterior
    try {
      const oldTurnDate = oldTurn?.date
        ? oldTurn.date instanceof Date
          ? oldTurn.date
          : new Date(oldTurn.date)
        : reservation.activityDate instanceof Date
          ? reservation.activityDate
          : new Date(reservation.activityDate);
      
      this.logger.log(
        `📧 Enviando correo de cancelación de turno anterior a ${reservation.user.email}`,
      );
      
      await this.mailService.sendReservationCancellation(reservation.user.email, {
        userName: reservation.user.name,
        activityName: oldActivityName,
        turnDate: oldTurnDate.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        turnTime: oldTurn?.startTime || reservation.startTime,
        reason: 'Reserva reasignada a otra actividad por el administrador',
        refundInfo:
          'Tu reserva ha sido reasignada a otra actividad. Revisa tu email para ver los nuevos detalles.',
        frontendUrl:
          this.configService.get<string>('FRONTEND_URL') ||
          'http://localhost:3001',
      });
      
      this.logger.log(
        `✅ Correo de cancelación de turno anterior enviado exitosamente a ${reservation.user.email}`,
      );
    } catch (error: any) {
      this.logger.error(
        `❌ Error al enviar correo de cancelación de turno anterior a ${reservation.user.email}:`,
        error?.message || error,
        error?.stack,
      );
    }

    return updatedReservation;
  }
}
