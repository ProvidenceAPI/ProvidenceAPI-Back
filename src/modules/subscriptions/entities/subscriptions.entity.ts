import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionStatus } from 'src/common/enum/subscriptionStatus.enum';
import { Activity } from 'src/modules/activities/entities/activity.entity';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { User } from 'src/modules/users/entities/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('subscriptions')
export class Subscription {
  @ApiProperty({
    example: '507ed3c9-6ee1-45aa-b075-0dc543321a88',
    description: 'Unique identifier for the subscription',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: '2025-01-15T00:00:00.000Z',
    description: 'Start date of the subscription',
  })
  @Column({ type: 'timestamp' })
  startDate: Date;

  @ApiProperty({
    example: '2025-01-15T00:00:00.000Z',
    description: 'Expiration date of the subscription',
  })
  @Column({ type: 'timestamp' })
  expirationDate: Date;

  @ApiProperty({
    example: SubscriptionStatus.active,
    description: 'Current status of the subscription',
  })
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.active,
  })
  status: SubscriptionStatus;

  @ApiProperty({
    example: 30000.0,
    description: 'Monthly price of the subscription',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: number;

  @ApiProperty({
    example: false,
    description: 'Indicates if the subscription is a free trial',
  })
  @Column({ type: 'boolean', default: false })
  isFreeTrial: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({
    type: () => User,
    description: 'The user associated with the subscription',
  })
  @ManyToOne(() => User, (user) => user.subscriptions, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({
    type: () => Activity,
    description: 'The activity associated with the subscription',
  })
  @ManyToOne(() => Activity, (activity) => activity.subscriptions, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({ name: 'activityId' })
  activity: Activity;

  @ApiProperty({
    type: () => Payment,
    description: 'The payment associated with the subscription',
  })
  @ManyToOne(() => Payment, (payment) => payment.subscription, {
    nullable: true,
  })
  @JoinColumn({ name: 'paymentId' })
  payment?: Payment;
}
