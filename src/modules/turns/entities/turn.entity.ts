import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Activity } from '../../activities/entities/activity.entity';
import { Reservation } from '../../reservations/entities/reservations.entity';

export enum TurnStatus {
  available = 'Available',
  full = 'Full',
  cancelled = 'Cancelled',
  completed = 'Completed',
}

@Entity('turns')
export class Turn {
  @ApiProperty({
    example: 'a1sdasded2124158a4da1da1sd4s1d',
    description: 'Unique turn identifier',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: '2025-02-15',
    description: 'Date of the turn',
  })
  @Column({ type: 'date' })
  date: Date;

  @ApiProperty({
    example: '10:00:00',
    description: 'Start time of the turn',
  })
  @Column({ type: 'time' })
  startTime: string;

  @ApiProperty({
    example: '11:00:00',
    description: 'End time of the turn',
  })
  @Column({ type: 'time' })
  endTime: string;

  @ApiProperty({
    example: 20,
    description: 'Total capacity for this turn',
  })
  @Column({ type: 'int' })
  capacity: number;

  @ApiProperty({
    example: 8,
    description: 'Available spots remaining',
  })
  @Column({ type: 'int' })
  availableSpots: number;

  @ApiProperty({
    enum: TurnStatus,
    example: TurnStatus.available,
    description: 'Current status of the turn',
  })
  @Column({
    type: 'enum',
    enum: TurnStatus,
    default: TurnStatus.available,
  })
  status: TurnStatus;

  @ApiProperty({
    example: false,
    description: 'Whether this is a free trial turn',
  })
  @Column({ type: 'boolean', default: false })
  isFreeTrial: boolean;

  @ApiProperty({
    example: 'Instructor change',
    required: false,
    description: 'Notes or observations about this turn',
  })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({
    type: () => Activity,
    description: 'Activity associated with this turn',
  })
  @ManyToOne(() => Activity, (activity) => activity.turns, { eager: true })
  @JoinColumn({ name: 'activityId' })
  activity: Activity;

  @Column({ type: 'uuid' })
  activityId: string;

  @ApiProperty({
    type: () => Reservation,
    isArray: true,
    description: 'Reservations for this turn',
  })
  @OneToMany(() => Reservation, (reservation) => reservation.turn)
  reservations: Reservation[];

  @ApiProperty({
    example: '2025-01-12T10:30:00.000Z',
    description: 'Creation timestamp',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-12T15:45:00.000Z',
    description: 'Last update timestamp',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
