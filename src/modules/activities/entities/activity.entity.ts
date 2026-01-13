import { Reservation } from 'src/modules/reservations/entities/reservations.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum ActivityStatus {
  active = 'Active',
  inactive = 'Inactive',
}

@Entity({
  name: 'activities',
})
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: false })
  description: string;

  @Column({ type: 'int', nullable: false })
  duration: number;

  @Column({ type: 'int', nullable: false, default: 24 })
  cancellationTime: number;

  @Column({ type: 'int', nullable: false, default: 15 })
  reservationDays: number;

  @Column({ type: 'int', nullable: false })
  capacity: number;

  @Column({ type: 'boolean', default: false })
  hasFreeTrial: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  @Column('simple-array', { nullable: false })
  schedule: string[];

  @Column({ type: 'varchar', nullable: true })
  image: string;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.active,
  })
  status: ActivityStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Reservation, (reservation) => reservation.activity)
  reservations: Reservation[];
}
