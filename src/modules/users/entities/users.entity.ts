import { Genre } from 'src/common/enum/genre.enum';
import { Rol } from 'src/common/enum/roles.enum';
import { UserStatus } from 'src/common/enum/userStatus.enum';
import { Reservation } from 'src/modules/reservations/entities/reservations.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity({
  name: 'users',
})
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  lastname: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    unique: true,
  })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  password: string;

  @Column({ type: 'date' })
  birthdate: Date;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'bigint', unique: true })
  dni: number;

  @Column({ type: 'varchar', nullable: true })
  profileImage: string;

  @Column({
    type: 'enum',
    enum: Genre,
    default: Genre.other,
  })
  genre: Genre;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.active,
  })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: Rol,
    default: Rol.user,
  })
  rol: Rol;

  @OneToMany(() => Reservation, (reservation) => reservation.user)
  reservations: Reservation[];
}
