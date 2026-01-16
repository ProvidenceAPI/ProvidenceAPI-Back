import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { ReservationsModule } from '../reservations/reservations.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Activity } from '../activities/entities/activity.entity';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Activity]),
    ReservationsModule,
    SubscriptionsModule,
    MercadoPagoModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
