import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from 'src/common/enum/authProvider.enum';
import { Genre } from 'src/common/enum/genre.enum';
import { Rol } from 'src/common/enum/roles.enum';
import { UserStatus } from 'src/common/enum/userStatus.enum';
import { Activity } from 'src/modules/activities/entities/activity.entity';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Reservation } from 'src/modules/reservations/entities/reservations.entity';
import { Subscription } from 'src/modules/subscriptions/entities/subscriptions.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';

@Entity({
  name: 'users',
})
export class User {
  @ApiProperty({
    example: '507ed3c9-6ee1-45aa-b075-0dc543321a88',
    description: 'Unique user identifier',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Valentina', description: 'User first name' })
  @Column({ type: 'varchar', length: 50, nullable: false })
  name: string;

  @ApiProperty({ example: 'Gómez', description: 'User last name' })
  @Column({ type: 'varchar', length: 50, nullable: false })
  lastname: string;

  @ApiProperty({
    example: 'valentina@gmail.com',
    description: 'User email address',
  })
  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    unique: true,
  })
  email: string;

  @ApiProperty({
    writeOnly: true,
    example: '********',
    description: 'User password',
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  password: string | null;

  @ApiProperty({ example: '1998-05-10', description: 'User birthdate' })
  @Column({ type: 'date' })
  birthdate: Date;

  @ApiProperty({ example: '1123456789', description: 'User phone number' })
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @ApiProperty({ example: 40123456, description: 'User DNI number' })
  @Column({ type: 'bigint', unique: true })
  dni: number;

  @ApiProperty({
    example: 'https://cdn.app.com/profile.png',
    required: false,
    description: 'URL of the user profile image',
  })
  @Column({ type: 'varchar', nullable: true })
  profileImage?: string;

  @ApiProperty({ enum: Genre })
  @Column({
    type: 'enum',
    enum: Genre,
    default: Genre.other,
  })
  genre: Genre;

  @ApiProperty({
    example: false,
    description: 'Whether the user has used their one-time free trial',
  })
  @Column({ type: 'boolean', default: false })
  hasUsedFreeTrial: boolean;

  @ApiProperty({ enum: UserStatus })
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.active,
  })
  status: UserStatus;

  @ApiProperty({ enum: Rol })
  @Column({
    type: 'enum',
    enum: Rol,
    default: Rol.user,
  })
  rol: Rol;

  @ApiProperty({ example: '2025-01-08T18:30:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ enum: AuthProvider })
  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider: AuthProvider;

  @ApiProperty({
    type: () => Reservation,
    isArray: true,
    description: 'User reservations',
  })
  @OneToMany(() => Reservation, (reservation) => reservation.user)
  reservations: Reservation[];

  @ApiProperty({
    type: () => Payment,
    isArray: true,
    description: 'User payments',
  })
  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @ApiProperty({
    type: () => Subscription,
    isArray: true,
    description: 'User subscriptions',
  })
  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions: Subscription[];

  @ApiProperty({
    type: () => Activity,
    isArray: true,
    description: 'Activities created by this user',
  })
  @OneToMany(() => Activity, (activity) => activity.createdBy)
  createdActivities: Activity[];
}
