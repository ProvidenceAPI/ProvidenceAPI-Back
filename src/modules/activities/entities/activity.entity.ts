import { ApiProperty } from '@nestjs/swagger';
import { Reservation } from 'src/modules/reservations/entities/reservations.entity';
import { Subscription } from 'src/modules/subscriptions/entities/subscriptions.entity';
import { Turn } from 'src/modules/turns/entities/turn.entity';
import { User } from 'src/modules/users/entities/users.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

export enum ActivityStatus {
  active = 'Active',
  inactive = 'Inactive',
}

@Entity({
  name: 'activities',
})
export class Activity {
  @ApiProperty({
    example: '507ed3c9-6ee1-45aa-b075-0dc543321a88',
    description: 'Unique identifier for the activity',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Yoga Class',
    description: 'Name of the activity',
  })
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @ApiProperty({
    example: 'Fede Dibello',
    description: 'Trainer/instructor name',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  trainer: string;

  @ApiProperty({
    example: 'A relaxing yoga class for all levels',
    description: 'Description of the activity',
  })
  @Column({ type: 'text', nullable: false })
  description: string;

  @ApiProperty({
    example: 60,
    description: 'Duration of the activity in minutes',
  })
  @Column({ type: 'int', nullable: false })
  duration: number;

  @ApiProperty({
    example: 24,
    description: 'Cancellation time in hours before the activity starts',
  })
  @Column({ type: 'int', nullable: false, default: 24 })
  cancellationTime: number;

  @ApiProperty({
    example: 15,
    description: 'Number of days in advance a reservation can be made',
  })
  @Column({ type: 'int', nullable: false, default: 15 })
  reservationDays: number;

  @ApiProperty({
    example: 20,
    description: 'Maximum capacity of participants for the activity',
  })
  @Column({ type: 'int', nullable: false })
  capacity: number;

  @ApiProperty({
    example: false,
    description: 'Indicates if the activity includes a free trial',
  })
  @Column({ type: 'boolean', default: false })
  hasFreeTrial: boolean;

  @ApiProperty({
    example: 3000.0,
    description: 'Price of the activity',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  @ApiProperty({
    example: ['Monday 10:00-11:00', 'Wednesday 14:00-15:00'],
    description: 'Schedule of the activity',
  })
  @Column('simple-array', { nullable: false })
  schedule: string[];

  @ApiProperty({
    example:
      'https://res.cloudinary.com/ds4vplktr/image/upload/v1768177288/profiles/rrl49oub36ljnyt67y69.jpg',
    description: 'Image URL representing the activity',
  })
  @Column({ type: 'varchar', nullable: true })
  image: string;

  @ApiProperty({
    example: ActivityStatus.active,
    description: 'Current status of the activity',
  })
  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.active,
  })
  status: ActivityStatus;

  @ApiProperty({ example: '2025-01-08', description: 'Activity creation date' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-15',
    description: 'Activity last update date',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ type: () => Reservation, isArray: true })
  @OneToMany(() => Reservation, (reservation) => reservation.activity, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  reservations: Reservation[];

  @ApiProperty({ type: () => Turn, isArray: true })
  @OneToMany(() => Turn, (turn) => turn.activity, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  turns: Turn[];

  @ApiProperty({ type: () => Subscription, isArray: true })
  @OneToMany(() => Subscription, (subscription) => subscription.activity)
  subscriptions: Subscription[];

  @ApiProperty({
    type: () => User,
    description: 'User who created this activity',
    required: false,
  })
  @ManyToOne(() => User, (user) => user.createdActivities, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;
}
