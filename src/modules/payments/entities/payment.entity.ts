import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/modules/users/entities/users.entity';
import { PaymentStatus } from 'src/common/enum/paymentStatus.enum';
import { Reservation } from 'src/modules/reservations/entities/reservations.entity';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ type: () => Reservation })
  @ManyToOne(() => Reservation, (reservation) => reservation.payments, {
    eager: true,
    nullable: true,
  })
  @ManyToOne(() => Reservation, { eager: true })
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;
}
