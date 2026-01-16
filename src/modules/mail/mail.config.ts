import { ConfigService } from '@nestjs/config';

export const getMailConfig = (configService: ConfigService) => {
  return {
    host: configService.get<string>('MAIL_HOST') || 'smtp.gmail.com',
    port: configService.get<number>('MAIL_PORT') || 587,
    secure: false, // true para puerto 465, false para otros
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
  };
};
