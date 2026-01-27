import { Injectable, Inject, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import {
  MERCADOPAGO_CLIENT,
  MERCADOPAGO_PREFERENCE,
} from './constants/mercadopago.constants';

export interface CreatePreferenceDto {
  items: Array<{
    title: string;
    unit_price: number;
    quantity: number;
  }>;
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return?: 'approved' | 'all';
  notification_url?: string;
  metadata?: Record<string, any>;
  statement_descriptor?: string;
  external_reference?: string;
  expires?: boolean;
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor(
    @Inject(MERCADOPAGO_CLIENT)
    private readonly client: MercadoPagoConfig,
    @Inject(MERCADOPAGO_PREFERENCE)
    private readonly preferenceClient: Preference,
  ) {}

  async createPreference(data: CreatePreferenceDto) {
    try {
      this.logger.log('Creating MercadoPago preference...');

      const preference = await this.preferenceClient.create({
        body: {
          items: data.items.map((item, index) => ({
            id: `item-${index}`,
            ...item,
          })),
          back_urls: data.back_urls,
          auto_return: data.auto_return || 'approved',
          notification_url: data.notification_url,
          metadata: data.metadata,
          payment_methods: {
            excluded_payment_methods: [],
            excluded_payment_types: [],
            installments: 3,
          },
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      });

      this.logger.log(`Preference created: ${preference.id}`);
      return preference;
    } catch (error) {
      this.logger.error('Error creating preference:', error);
      throw error;
    }
  }

  async getPayment(paymentId: string) {
    try {
      this.logger.log(`Fetching payment: ${paymentId}`);
      const payment = new Payment(this.client);
      const paymentData = await payment.get({ id: paymentId });
      return paymentData;
    } catch (error) {
      this.logger.error(`Error fetching payment ${paymentId}:`, error);
      throw error;
    }
  }

  verifyWebhookSignature(
    dataId: string,
    xSignature: string,
    xRequestId: string,
  ): boolean {
    try {
      this.logger.log('Webhook signature verification (TODO)');
      return true;
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  getClient(): MercadoPagoConfig {
    return this.client;
  }
}
