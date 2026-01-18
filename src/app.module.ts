import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import typeorm from './config/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from './modules/users/users.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { TurnsModule } from './modules/turns/turns.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { MercadoPagoModule } from './modules/mercadopago/mercadopago.module';
import { AdminNotificationsModule } from './modules/admin-notifications/admin-notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [typeorm],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('typeorm')!,
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
    }),
    ScheduleModule.forRoot(),
    MercadoPagoModule,
    AuthModule,
    UserModule,
    ActivitiesModule,
    TurnsModule,
    ReservationsModule,
    PaymentsModule,
    SubscriptionsModule,
    AdminNotificationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
