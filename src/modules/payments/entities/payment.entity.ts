import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from 'src/modules/users/entities/users.entity';
import { PaymentStatus } from 'src/common/enum/paymentStatus.enum';
import { Reservation } from 'src/modules/reservations/entities/reservations.entity';
import { Activity } from 'src/modules/activities/entities/activity.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Subscription } from 'src/modules/subscriptions/entities/subscriptions.entity';

@Entity('payments')
export class Payment {
  @ApiProperty({
    example: 'b3e1f7a6-8c2f-4b1e-9f6d-123456789abc',
    description: 'Unique payment identifier',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 1500.5,
    description: 'Payment amount',
  })
  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.pending,
    description: 'Current payment status',
  })
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.pending,
  })
  status: PaymentStatus;

  @ApiProperty({
    example: 'MP-123456789',
    required: false,
    description: 'MercadoPago payment ID',
  })
  @Column({ nullable: true })
  mercadoPagoId?: string;

  @ApiProperty({
    example: 'pref-abc123xyz',
    required: false,
    description: 'MercadoPago preference ID',
  })
  @Column({ nullable: true })
  mercadoPagoPreferenceId?: string;

  @ApiProperty({
    example: '2025-01-08T18:30:00.000Z',
    description: 'Payment creation date',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-15T23:59:59.000Z',
    required: false,
    description: 'Fecha límite para realizar el pago (ej. para recordatorios)',
  })
  @Column({ type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ type: () => Reservation })
  @ManyToOne(() => Reservation, { eager: true, nullable: true })
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  @ApiProperty({ type: () => Activity })
  @ManyToOne(() => Activity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activityId' })
  activity: Activity | null;

  @Column({ type: 'uuid', nullable: true })
  activityId: string | null;
}
