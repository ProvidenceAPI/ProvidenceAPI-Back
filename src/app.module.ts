import { Module } from '@nestjs/common';
<<<<<<< HEAD

import { AuthModule } from './modules/auth/auth.modules';
import { ConfigModule, ConfigService } from '@nestjs/config';
import typeorm from './config/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

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
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '1h',
      },
    }),

    AuthModule,
  ],
  controllers: [],
  providers: [],
=======
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AppController],
  providers: [AppService],
>>>>>>> e66ec6edeca5f98e11f9247ec033857ce7075ba4
})
export class AppModule {}
