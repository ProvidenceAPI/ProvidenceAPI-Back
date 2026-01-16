import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
import { PaymentResponseDto } from './dtos/payment-response.dto';

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
  ) {}

  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    let amount: number;
    let activityName: string;
    let activityId: string;
    let reservationId: string | undefined;
    let isSubscription = false;
    if (dto.reservationId) {
      const reservation = await this.reservationsService.findById(
        dto.reservationId,
      );

      if (!reservation) throw new NotFoundException('Reservation not found');
      if (reservation.user.id !== userId)
        throw new ForbiddenException('This reservation is not yours');
      if (reservation.paymentStatus === PaymentStatus.approved)
        throw new BadRequestException('Reservation already paid');

      amount = Number(reservation.activity.price);
      activityName = reservation.activity.name;
      activityId = reservation.activity.id;
      reservationId = reservation.id;
    } else if (dto.activityId) {
      const activity = await this.activityRepository.findOne({
        where: { id: dto.activityId },
      });
      if (!activity) throw new NotFoundException('Activity not found');

      amount = Number(activity.price);
      activityName = activity.name;
      activityId = activity.id;
      isSubscription = true;
    } else {
      throw new BadRequestException(
        'Either reservationId or activityId must be provided',
      );
    }
    const payment = this.paymentRepository.create({
      amount,
      user: { id: userId } as any,
      reservation: reservationId ? ({ id: reservationId } as any) : null,
      status: PaymentStatus.pending,
    });
    const savedPayment = await this.paymentRepository.save(payment);
    try {
      console.log(
        'Webhook URL:',
        `${this.configService.get('PUBLIC_API_URL')}/api/payments/webhook`,
      );
      const preference = await this.mercadopagoService.createPreference({
        items: [
          {
            title: activityName,
            unit_price: amount,
            quantity: 1,
          },
        ],
        back_urls: {
          success: `${this.configService.get('FRONTEND_URL')}/payment/success`,
          failure: `${this.configService.get('FRONTEND_URL')}/payment/failure`,
          pending: `${this.configService.get('FRONTEND_URL')}/payment/pending`,
        },
        notification_url: `${this.configService.get('PUBLIC_API_URL')}/payments/webhook`,
        metadata: {
          userId,
          activityId,
          reservationId: reservationId || null,
          isSubscription: isSubscription.toString(),
          internalPaymentId: savedPayment.id,
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
      console.error('Error creating MercadoPago preference:', error);
      throw new InternalServerErrorException(
        'Error creating payment. Please try again.',
      );
    }
  }

  async handleWebhook(notification: any) {
    try {
      console.log('Webhook received:', JSON.stringify(notification, null, 2));
      if (notification.topic === 'merchant_order') {
        const orderId = notification.resource.split('/').pop();
        console.log('Merchant order received:', orderId);
        return { received: true, message: 'Merchant order received' };
      }
      if (notification.type !== 'payment') {
        return { received: true, message: 'Notification type not supported' };
      }
      const paymentId = notification.data.id;

      const paymentData = await this.mercadopagoService.getPayment(paymentId);
      if (!paymentData) {
        console.error('Payment data not found in MercadoPago');
        return { received: true, message: 'Payment not found' };
      }
      const metadata = paymentData.metadata || {};
      const internalPaymentId = metadata.internalPaymentId;

      const payment = await this.paymentRepository.findOne({
        where: { id: internalPaymentId },
        relations: ['reservation', 'reservation.activity', 'user'],
      });
      if (!payment) {
        console.error('Payment not found in database');
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
      console.error('Error processing webhook:', error);
      return { received: true, error: error.message };
    }
  }

  private async handleApprovedPayment(payment: Payment, paymentData: any) {
    payment.status = PaymentStatus.approved;
    payment.mercadoPagoId = paymentData.id.toString();

    const metadata = paymentData.metadata || {};
    const isSubscription = metadata.isSubscription === 'true';
    const activityId = metadata.activityId;
    const userId = payment.user.id;

    if (payment.reservation) {
      payment.reservation.paymentStatus = PaymentStatus.approved;
      await this.paymentRepository.save(payment);
    } else {
      await this.paymentRepository.save(payment);
    }

    if (isSubscription || payment.reservation) {
      const targetActivityId = activityId || payment.reservation?.activity?.id;
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
          console.log(`Subscription created/extended for user ${userId}`);
        } catch (error) {
          console.error('Error creating/extending subscription:', error);
        }
      }
    }
    // TODO: Enviar email de confirmación
    // await this.emailService.sendPaymentConfirmation(payment);
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
      order: { createdAt: 'DESC' },
    });
  }

  async getAllPayments() {
    return await this.paymentRepository.find({
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
}
