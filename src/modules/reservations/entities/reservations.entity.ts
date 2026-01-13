import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { ReservationStatus } from 'src/common/enum/reservations.enum';
import { PaymentStatus } from 'src/common/enum/paymentStatus.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Activity } from 'src/modules/activities/entities/activity.entity';

@Entity('reservations')
export class Reservation {
  @ApiProperty({
    example: 'b1a2c3d4-e5f6-7890-abcd-123456789abc',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '2025-02-15' })
  @Column({ type: 'date' })
  activityDate: Date;

  @ApiProperty({ example: '14:00' })
  @Column({ type: 'time' })
  startTime: string;

  @ApiProperty({ example: '16:00' })
  @Column({ type: 'time' })
  endTime: string;

  @ApiProperty({ enum: ReservationStatus })
  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.confirmed,
  })
  status: ReservationStatus;

  @ApiProperty({
    enum: PaymentStatus,
    description: 'Payment status of the reservation',
  })
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.pending,
  })
  paymentStatus: PaymentStatus;

  @ApiProperty({ example: '2025-01-08T18:30:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.reservations, { eager: true })
  user: User;

  @ApiProperty({ type: () => Activity })
  @ManyToOne(() => Activity, (activity) => activity.reservations, {
    eager: true,
    nullable: false,
  })
  @JoinColumn({ name: 'activityId' })
  activity: Activity;

  @ApiProperty({ type: () => Payment, isArray: true })
  @OneToMany(() => Payment, (payment) => payment.reservation)
  payments: Payment[];
}
