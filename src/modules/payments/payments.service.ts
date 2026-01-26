import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import { PaymentStatus } from 'src/common/enum/paymentStatus.enum';
import { Activity } from '../activities/entities/activity.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ConfigService } from '@nestjs/config';
import MercadoPagoConfig, { Preference } from 'mercadopago';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PaymentsService {
  private mercadoPagoClient: MercadoPagoConfig;
  private preferenceClient: Preference;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    private readonly reservationsService: ReservationsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
    private readonly mercadopagoService: MercadoPagoService,
    private readonly mailService: MailService,
  ) {}

  async createPayment(userId: string, dto: CreatePaymentDto) {
    const activity = await this.activityRepository.findOne({
      where: { id: dto.activityId },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    const amount = Number(activity.price);
    const activityName = activity.name;
    const activityId = activity.id;
    const reservationId = null;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    dueDate.setHours(23, 59, 59, 999);

    const payment = this.paymentRepository.create({
      amount: amount,
      user: { id: userId } as any,
      reservation: undefined,
      status: PaymentStatus.pending,
      dueDate,
      activity: { id: activity.id },
    });
    const savedPayment = await this.paymentRepository.save(payment);
    try {
      const preference = await this.mercadopagoService.createPreference({
        items: [
          {
            title: activityName,
            unit_price: amount,
            quantity: 1,
          },
        ],
        back_urls: {
          success: `${this.configService.get('FRONTEND_URL')}/mis-pagos?status=approved`,
          failure: `${this.configService.get('FRONTEND_URL')}/mis-pagos?status=rejected`,
          pending: `${this.configService.get('FRONTEND_URL')}/mis-pagos?status=pending`,
        },
        notification_url: `${this.configService.get('PUBLIC_API_URL')}/api/payments/webhook`,
        metadata: {
          user_id: userId,
          activity_id: activityId,
          reservation_id: reservationId || null,
          is_subscription: 'true',
          internal_payment_id: savedPayment.id,
        },
      });
      savedPayment.mercadoPagoPreferenceId = preference.id;
      await this.paymentRepository.save(savedPayment);
      if (!preference.id) {
        throw new InternalServerErrorException(
          'MercadoPago preference ID not generated',
        );
      }
      return {
        paymentId: savedPayment.id,
        preferenceId: preference.id,
        initPoint: preference.init_point || '',
        amount,
        status: PaymentStatus.pending,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error creating payment. Please try again.',
      );
    }
  }

  async handleWebhook(notification: any) {
    try {
      if (notification.topic === 'merchant_order') {
        const orderId = notification.resource.split('/').pop();
        const orderResponse = await fetch(notification.resource, {
          headers: {
            Authorization: `Bearer ${this.configService.get('MP_ACCESS_TOKEN')}`,
          },
        });
        const orderData = await orderResponse.json();
        const payment = await this.paymentRepository.findOne({
          where: { mercadoPagoPreferenceId: orderData.preference_id },
          relations: ['user'],
        });
        if (!payment) {
          return { received: true, message: 'Payment not found in database' };
        }
        if (orderData.payments && orderData.payments.length > 0) {
          const paymentId = orderData.payments[0].id;
          const paymentData =
            await this.mercadopagoService.getPayment(paymentId);
          if (paymentData.status === 'approved') {
            await this.handleApprovedPayment(payment, paymentData);
          } else if (paymentData.status === 'rejected') {
            payment.status = PaymentStatus.rejected;
            await this.paymentRepository.save(payment);
          }
          return { received: true, status: paymentData.status };
        }
        return { received: true, message: 'No payments in order' };
      }
      if (notification.type !== 'payment') {
        return { received: true, message: 'Notification type not supported' };
      }
      const paymentId = notification.data.id;
      const paymentData = await this.mercadopagoService.getPayment(paymentId);
      if (!paymentData) {
        return { received: true, message: 'Payment not found' };
      }
      const metadata = paymentData.metadata || {};
      const internalPaymentId = metadata.internalPaymentId;

      const payment = await this.paymentRepository.findOne({
        where: { id: internalPaymentId },
        relations: ['user'],
      });
      if (!payment) {
        return { received: true, message: 'Payment not found in database' };
      }
      if (paymentData.status === 'approved') {
        await this.handleApprovedPayment(payment, paymentData);
      } else if (paymentData.status === 'rejected') {
        payment.status = PaymentStatus.rejected;
        await this.paymentRepository.save(payment);
      } else if (paymentData.status === 'pending') {
        payment.status = PaymentStatus.pending;
        await this.paymentRepository.save(payment);
      }
      return { received: true, status: paymentData.status };
    } catch (error) {
      return { received: true, error: error.message };
    }
  }

  private async handleApprovedPayment(payment: Payment, paymentData: any) {
    payment.status = PaymentStatus.approved;
    payment.mercadoPagoId = paymentData.id.toString();

    const metadata = paymentData.metadata || {};
    const isSubscription = metadata.is_subscription === 'true';
    const activityId = metadata.activity_id;
    const userId = payment.user.id;

    if (payment.reservation) {
      payment.reservation.paymentStatus = PaymentStatus.approved;
      await this.paymentRepository.save(payment);
    } else {
      await this.paymentRepository.save(payment);
    }
    let targetActivityId: string | undefined;
    if (isSubscription && activityId) {
      targetActivityId = activityId;
    } else if (payment.reservation?.activity?.id) {
      targetActivityId = payment.reservation.activity.id;
    } else {
      console.error('❌ No activityId found in metadata or reservation');
    }

    if (targetActivityId) {
      try {
        const hasActiveSubscription =
          await this.subscriptionsService.checkSubscriptionStatus(
            userId,
            targetActivityId,
          );

        if (hasActiveSubscription) {
          await this.subscriptionsService.extendSubscription(
            userId,
            targetActivityId,
            payment.id,
          );
        } else {
          await this.subscriptionsService.createSubscription(
            userId,
            targetActivityId,
            payment.id,
            false,
          );
        }
      } catch (error) {
        console.error('❌ Error creating/extending subscription:', error);
        console.error('Error stack:', error.stack);
      }
    } else {
      console.error('❌ Cannot create subscription: no targetActivityId');
    }
    try {
      await this.mailService.sendPaymentConfirmation(payment.user.email, {
        userName: payment.user.name,
        activityName:
          payment.reservation?.turn?.activity?.name || 'Suscripción',
        amount: payment.amount,
        paymentDate: new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        paymentMethod: 'MercadoPago',
        transactionId: payment.mercadoPagoId,
        description: payment.reservation
          ? `Pago de clase - ${payment.reservation?.turn?.activity?.name}`
          : 'Pago de suscripción mensual',
        reservationDate: payment.reservation
          ? payment.reservation.activityDate.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'N/A',
        reservationTime: payment.reservation?.startTime || 'N/A',
        frontendUrl:
          this.configService.get<string>('FRONTEND_URL') ||
          'http://localhost:3001',
      });
    } catch (error) {
      console.error(
        '❌ Error sending payment confirmation email:',
        error.message,
      );
    }
  }

  async updatePaymentStatus(paymentId: string, status: PaymentStatus) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    payment.status = status;
    return this.paymentRepository.save(payment);
  }

  async getMyPayments(userId: string) {
    return await this.paymentRepository.find({
      where: { user: { id: userId } },
      relations: [
        'activity',
        'reservation',
        'subscriptions',
        'subscriptions.activity',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllPayments() {
    return await this.paymentRepository.find({
      relations: [
        'activity',
        'reservation',
        'user',
        'subscriptions',
        'subscriptions.activity',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async getPaymentById(paymentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async getMonthlyRevenue() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.approved })
      .andWhere('payment.createdAt >= :start', { start: startOfMonth })
      .andWhere('payment.createdAt <= :end', { end: endOfMonth })
      .getMany();

    const total = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    return {
      total,
      count: payments.length,
      month: startOfMonth.toLocaleString('es-ES', {
        month: 'long',
        year: 'numeric',
      }),
    };
  }
}
