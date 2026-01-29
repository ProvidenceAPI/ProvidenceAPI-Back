import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial } from './entities/testimonial.entity';
import { Reservation } from '../reservations/entities/reservations.entity';
import { ReservationStatus } from 'src/common/enum/reservations.enum';
import { CreateTestimonialDto } from './dtos/createTestimonial.dto';

@Injectable()
export class TestimonialsService {
  constructor(
    @InjectRepository(Testimonial)
    private readonly testimonialRepo: Repository<Testimonial>,
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
  ) {}

  async create(userId: string, dto: CreateTestimonialDto) {
    const completedReservations = await this.reservationRepo.count({
      where: {
        user: { id: userId },
        status: ReservationStatus.completed,
      },
    });
    if (completedReservations === 0) {
      throw new ForbiddenException(
        'You must complete at least one activity to leave a testimonial',
      );
    }
    const existingTestimonial = await this.testimonialRepo.findOne({
      where: { user: { id: userId } },
    });
    if (existingTestimonial) {
      throw new BadRequestException(
        'You already have a registered testimonial',
      );
    }
    const testimonial = this.testimonialRepo.create({
      comment: dto.comment,
      rating: dto.rating,
      profession: dto.profession,
      user: { id: userId } as any,
    });
    return await this.testimonialRepo.save(testimonial);
  }

  async getAllTestimonials(page: number = 1, limit: number = 6) {
    const skip = (page - 1) * limit;
    const [testimonials, total] = await this.testimonialRepo.findAndCount({
      order: { createdAt: 'DESC' },
      relations: ['user'],
      skip: skip,
      take: limit,
    });
    return {
      testimonials,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteTestimonial(id: string) {
    const testimonial = await this.testimonialRepo.findOne({ where: { id } });
    if (!testimonial) throw new NotFoundException('Testimony not found');
    await this.testimonialRepo.remove(testimonial);
    return { message: 'Deleted testimonial' };
  }

  async checkUserEligibility(userId: string) {
    const completedReservations = await this.reservationRepo.count({
      where: {
        user: { id: userId },
        status: ReservationStatus.completed,
      },
    });
    const hasTestimonial = await this.testimonialRepo.findOne({
      where: { user: { id: userId } },
    });
    return {
      canCreateTestimonial: completedReservations > 0 && !hasTestimonial,
      completedActivities: completedReservations,
      hasExistingTestimonial: !!hasTestimonial,
    };
  }
}
