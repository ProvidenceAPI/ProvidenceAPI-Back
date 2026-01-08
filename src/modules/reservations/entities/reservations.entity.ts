import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { ReservationStatus } from 'src/common/enum/reservations.enum';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  activityDate: Date;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.pending,
  })
  status: ReservationStatus;

  @CreateDateColumn()
  createdAt: Date;
}
