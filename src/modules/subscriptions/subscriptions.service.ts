import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Subscription } from './entities/subscriptions.entity';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { Activity } from '../activities/entities/activity.entity';
import { SubscriptionStatus } from 'src/common/enum/subscriptionStatus.enum';
import { SubscriptionResponseDto } from './dtos/subscription-response.dto';
import { Payment } from '../payments/entities/payment.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
  ) {}

  async checkSubscriptionStatus(
    userId: string,
    activityId: string,
  ): Promise<boolean> {
    const now = new Date();
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        user: { id: userId },
        activity: { id: activityId },
        status: SubscriptionStatus.active,
      },
    });
    if (!subscription) return false;
    if (subscription.expirationDate < now) {
      subscription.status = SubscriptionStatus.expired;
      await this.subscriptionRepository.save(subscription);
      return false;
    }
    return true;
  }

  async hasUsedFreeTrial(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    return user?.hasUsedFreeTrial || false;
  }

  async markFreeTrialAsUsed(userId: string, activityId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    if (user.hasUsedFreeTrial) {
      throw new BadRequestException('Free trial already used');
    }
    user.hasUsedFreeTrial = true;
    await this.userRepository.save(user);

    const freeTrialRecord = this.subscriptionRepository.create({
      user,
      activity,
      startDate: new Date(),
      expirationDate: new Date(),
      monthlyPrice: 0,
      isFreeTrial: true,
      status: SubscriptionStatus.expired,
    });
    return await this.subscriptionRepository.save(freeTrialRecord);
  }

  async getActiveSubscriptions(
    userId: string,
  ): Promise<SubscriptionResponseDto[]> {
    const subscriptions = await this.subscriptionRepository.find({
      where: {
        user: { id: userId },
        status: SubscriptionStatus.active,
      },
      order: { expirationDate: 'ASC' },
    });
    return subscriptions.map((sub) => this.mapToResponseDto(sub));
  }

  async getAllUserSubscriptions(
    userId: string,
  ): Promise<SubscriptionResponseDto[]> {
    const subscriptions = await this.subscriptionRepository.find({
      where: {
        user: { id: userId },
      },
      order: { createdAt: 'DESC' },
    });
    return subscriptions.map((sub) => this.mapToResponseDto(sub));
  }
  async createSubscription(
    userId: string,
    activityId: string,
    paymentId: string,
    isFreeTrial: boolean = false,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    const hasActiveSubscription = await this.checkSubscriptionStatus(
      userId,
      activityId,
    );
    if (hasActiveSubscription) {
      throw new ConflictException(
        'User already has an active subscription for this activity',
      );
    }
    if (isFreeTrial) {
      const hasUsedFreeTrial = await this.hasUsedFreeTrial(userId);
      if (hasUsedFreeTrial)
        throw new BadRequestException('Ya has usado tu prueba gratis');
    }
    const startDate = new Date();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    const subscription = this.subscriptionRepository.create({
      user,
      activity,
      payment: paymentId ? ({ id: paymentId } as Payment) : undefined,
      startDate,
      expirationDate,
      monthlyPrice: isFreeTrial ? 0 : activity.price,
      isFreeTrial,
      status: SubscriptionStatus.active,
    });

    return await this.subscriptionRepository.save(subscription);
  }

  async extendSubscription(
    userId: string,
    activityId: string,
    paymentId: string,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        user: { id: userId },
        activity: { id: activityId },
      },
      order: { createdAt: 'DESC' },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    const activity = await this.activityRepository.findOne({
      where: { id: activityId },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    const now = new Date();
    let newExpirationDate: Date;
    if (
      subscription.status === SubscriptionStatus.active &&
      subscription.expirationDate > now
    ) {
      newExpirationDate = new Date(subscription.expirationDate);
      newExpirationDate.setDate(newExpirationDate.getDate() + 30);
    } else {
      newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + 30);
    }
    subscription.expirationDate = newExpirationDate;
    subscription.status = SubscriptionStatus.active;
    subscription.monthlyPrice = activity?.price;
    subscription.payment = { id: paymentId } as Payment;
    return await this.subscriptionRepository.save(subscription);
  }

  async getExpiringSubscriptions(): Promise<Subscription[]> {
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .leftJoinAndSelect('subscription.activity', 'activity')
      .where('subscription.status = :status', {
        status: SubscriptionStatus.active,
      })
      .andWhere('subscription.expirationDate BETWEEN :now AND :threeDays', {
        now,
        threeDays: threeDaysFromNow,
      })
      .getMany();
  }

  async getSubscriptionStats() {
    const [active, expired, cancelled, total, freeTrialUsed] =
      await Promise.all([
        this.subscriptionRepository.count({
          where: { status: SubscriptionStatus.active },
        }),
        this.subscriptionRepository.count({
          where: { status: SubscriptionStatus.expired },
        }),
        this.subscriptionRepository.count({
          where: { status: SubscriptionStatus.cancelled },
        }),
        this.subscriptionRepository.count(),
        this.subscriptionRepository.count({
          where: { isFreeTrial: true },
        }),
      ]);
    return { active, expired, cancelled, total, freeTrialUsed };
  }
  private mapToResponseDto(subscription: Subscription) {
    const now = new Date();
    const daysRemaining = Math.ceil(
      (subscription.expirationDate.getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return {
      id: subscription.id,
      startDate: subscription.startDate,
      expirationDate: subscription.expirationDate,
      status: subscription.status,
      monthlyPrice: Number(subscription.monthlyPrice),
      isFreeTrial: subscription.isFreeTrial,
      activity: {
        id: subscription.activity.id,
        name: subscription.activity.name,
        image: subscription.activity.image,
        price: Number(subscription.activity.price),
      },
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
    };
  }

  async getSubscriptionMetrics() {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const [total, active, expired, expiringSoon, expiredRecently] =
      await Promise.all([
        this.subscriptionRepository.count(),
        this.subscriptionRepository.count({
          where: { status: SubscriptionStatus.active },
        }),
        this.subscriptionRepository.count({
          where: { status: SubscriptionStatus.expired },
        }),
        this.subscriptionRepository.count({
          where: {
            status: SubscriptionStatus.active,
            expirationDate: Between(now, sevenDaysFromNow),
          },
        }),
        this.subscriptionRepository.count({
          where: {
            status: SubscriptionStatus.expired,
            expirationDate: MoreThanOrEqual(thirtyDaysAgo),
          },
        }),
      ]);
    const retentionRate =
      total > 0 ? parseFloat(((active / total) * 100).toFixed(2)) : 0;
    const result = {
      total,
      active,
      expired,
      expiringSoon,
      expiredRecently,
      retentionRate,
      expirationRate: parseFloat((100 - retentionRate).toFixed(2)),
    };
    return result;
  }
}
