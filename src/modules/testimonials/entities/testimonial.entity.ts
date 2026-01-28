import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/modules/users/entities/users.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('testimonials')
export class Testimonial {
  @ApiProperty({
    example: '507ed3c9-6ee1-45aa-b075-0dc543321a88',
    description: 'Unique user identifier',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Providence changed my life!',
    description: 'Comment about your experience at Providence Fitness',
  })
  @Column('text')
  comment: string;

  @ApiProperty({
    example: 'Boxer',
    description: 'Current profession',
  })
  @Column('text')
  profession: string;

  @ApiProperty({
    example: '5 starts',
    description: 'Rate your experience with us',
  })
  @Column('int')
  rating: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}
