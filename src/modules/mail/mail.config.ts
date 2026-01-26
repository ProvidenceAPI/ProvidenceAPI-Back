import { ConfigService } from '@nestjs/config';

export const getMailConfig = (configService: ConfigService) => {
  const provider = configService.get<string>('MAIL_PROVIDER') || 'smtp';

  if (provider === 'resend') {
    return {
      provider: 'resend',
      apiKey: configService.get<string>('RESEND_API_KEY'),
      from: {
        name: 'Providence Fitness',
        address:
          configService.get<string>('MAIL_FROM') || 'onboarding@resend.dev',
      },
    };
  }

  // Fallback a SMTP (Gmail para desarrollo local)
  return {
    provider: 'smtp',
    host: configService.get<string>('MAIL_HOST') || 'smtp.gmail.com',
    port: configService.get<number>('MAIL_PORT') || 587,
    secure: false,
    auth: {
      user: configService.get<string>('MAIL_USER'),
      pass: configService.get<string>('MAIL_PASSWORD'),
    },
    from: {
      name: 'Providence Fitness',
      address:
        configService.get<string>('MAIL_FROM') ||
        'noreply@providencefitness.com',
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    logger: true,
    debug: configService.get<string>('NODE_ENV') !== 'production',
  };
};
