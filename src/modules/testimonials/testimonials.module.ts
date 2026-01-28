import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestimonialsController } from './testimonials.controller';
import { TestimonialsService } from './testimonials.service';
import { Testimonial } from './entities/testimonial.entity';
import { Reservation } from '../reservations/entities/reservations.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Testimonial, Reservation])],
  controllers: [TestimonialsController],
  providers: [TestimonialsService],
  exports: [TestimonialsService],
})
export class TestimonialsModule {}
