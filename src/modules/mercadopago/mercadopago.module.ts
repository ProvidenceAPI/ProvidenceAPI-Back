import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { MercadoPagoService } from './mercadopago.service';
import {
  MERCADOPAGO_CLIENT,
  MERCADOPAGO_PREFERENCE,
} from './constants/mercadopago.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MERCADOPAGO_CLIENT,
      useFactory: (configService: ConfigService) => {
        const accessToken = configService.get<string>('MP_ACCESS_TOKEN');
        if (!accessToken) {
          throw new Error('MP_ACCESS_TOKEN not configured');
        }
        return new MercadoPagoConfig({
          accessToken,
          options: {
            timeout: 5000,
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: MERCADOPAGO_PREFERENCE,
      useFactory: (client: MercadoPagoConfig) => {
        return new Preference(client);
      },
      inject: [MERCADOPAGO_CLIENT],
    },
    MercadoPagoService,
  ],
  exports: [MercadoPagoService, MERCADOPAGO_CLIENT],
})
export class MercadoPagoModule {}
