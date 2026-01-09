import { ApiProperty } from '@nestjs/swagger';
import { AuthProvider } from 'src/common/enum/authProvider.enum';
import { Genre } from 'src/common/enum/genre.enum';
import { Rol } from 'src/common/enum/roles.enum';
import { UserStatus } from 'src/common/enum/userStatus.enum';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Reservation } from 'src/modules/reservations/entities/reservations.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity({
  name: 'users',
})
export class User {
  @ApiProperty({
    example: '507ed3c9-6ee1-45aa-b075-0dc543321a88',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Valentina' })
  @Column({ type: 'varchar', length: 50, nullable: false })
  name: string;

  @ApiProperty({ example: 'Gómez' })
  @Column({ type: 'varchar', length: 50, nullable: false })
  lastname: string;

  @ApiProperty({
    example: 'valentina@gmail.com',
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
  })
  @Column({ type: 'varchar', length: 100, nullable: false })
  password: string;

  @ApiProperty({ example: '1998-05-10' })
  @Column({ type: 'date' })
  birthdate: Date;

  @ApiProperty({ example: '1123456789' })
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @ApiProperty({ example: 40123456 })
  @Column({ type: 'bigint', unique: true })
  dni: number;

  @ApiProperty({
    example: 'https://cdn.app.com/profile.png',
    required: false,
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

  @ApiProperty({ enum: AuthProvider })
  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider: AuthProvider;

  @ApiProperty({ type: () => Reservation, isArray: true })
  @OneToMany(() => Reservation, (reservation) => reservation.user)
  reservations: Reservation[];

  @ApiProperty({ type: () => Payment, isArray: true })
  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];
}
