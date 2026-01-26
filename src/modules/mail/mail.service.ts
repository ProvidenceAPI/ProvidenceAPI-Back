import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { getMailConfig } from './mail.config';
import {
  MailOptions,
  WelcomeEmailData,
  ReservationConfirmationData,
  PaymentConfirmationData,
  TurnCancellationData,
  TurnReminderData,
  PaymentAlertData,
  AdminNotificationData,
} from './interfaces/mail-options.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private transporter: Transporter;
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly templatesPath: string;
  private readonly mailConfig: any;
  private readonly isResend: boolean;

  constructor(private readonly configService: ConfigService) {
    this.mailConfig = getMailConfig(configService);
    this.isResend = this.mailConfig.provider === 'resend';

    if (this.isResend) {
      this.resend = new Resend(this.mailConfig.apiKey);
      this.logger.log('✅ Mail service initialized with Resend');
    } else {
      this.transporter = nodemailer.createTransport(this.mailConfig);
      this.logger.log('✅ Mail service initialized with SMTP');
      this.verifyConnection();
    }

    this.templatesPath = this.resolveTemplatesPath();
  }

  private resolveTemplatesPath(): string {
    const nextToModule = path.join(__dirname, 'templates');
    if (fs.existsSync(nextToModule)) {
      return nextToModule;
    }
    const distTemplates = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'modules',
      'mail',
      'templates',
    );
    if (fs.existsSync(distTemplates)) {
      return distTemplates;
    }
    this.logger.warn(
      `Templates not found at ${nextToModule} nor ${distTemplates}. Using __dirname/templates as fallback.`,
    );
    return nextToModule;
  }

  private async verifyConnection() {
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');
    if (!user || !pass) {
      this.logger.warn(
        'Mail not configured (MAIL_USER/MAIL_PASSWORD). Skipping verification. Emails will not be sent.',
      );
      return;
    }
    try {
      await this.transporter.verify();
      this.logger.log('✅ Mail server connection established');
    } catch (error: any) {
      this.logger.error(
        '❌ Mail server connection failed:',
        error?.message || error,
      );
    }
  }

  private loadTemplate(templateName: string): string {
    const templatePath = path.join(this.templatesPath, `${templateName}.html`);
    try {
      return fs.readFileSync(templatePath, 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to load template: ${templateName}`, error);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  private replaceVariables(
    template: string,
    data: Record<string, any>,
  ): string {
    let result = template;
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(
        regex,
        data[key] != null ? String(data[key]) : '',
      );
    });
    return result;
  }

  private async sendMail(options: MailOptions): Promise<void> {
    // Validación para SMTP
    if (!this.isResend) {
      const user = this.configService.get<string>('MAIL_USER');
      const pass = this.configService.get<string>('MAIL_PASSWORD');

      if (!user || !pass) {
        this.logger.warn(
          `⚠️ Mail no configurado (MAIL_USER/MAIL_PASSWORD faltantes). No se puede enviar correo a ${options.to}`,
        );
        throw new Error(
          'Mail service not configured. MAIL_USER and MAIL_PASSWORD are required.',
        );
      }
    }

    try {
      if (this.isResend) {
        // Enviar con Resend
        const result = await this.resend.emails.send({
          from: `${this.mailConfig.from.name} <${this.mailConfig.from.address}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        this.logger.log(
          `✅ Email sent via Resend to ${options.to}: ${result.data?.id}`,
        );
      } else {
        // Enviar con SMTP
        const user = this.configService.get<string>('MAIL_USER');
        const mailOptions = {
          from: `Providence Fitness <${this.configService.get('MAIL_FROM') || user}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          attachments: options.attachments,
        };

        const info = await this.transporter.sendMail(mailOptions);
        this.logger.log(
          `✅ Email sent via SMTP to ${options.to}: ${info.messageId}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to send email to ${options.to}:`,
        error?.message || error,
        error?.stack,
      );
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<void> {
    const template = this.loadTemplate('welcome');
    const html = this.replaceVariables(template, data);

    await this.sendMail({
      to: email,
      subject: '¡Bienvenido a Providence Fitness! 🏋️',
      html,
    });
  }

  async sendReservationConfirmation(
    email: string,
    data: ReservationConfirmationData,
  ): Promise<void> {
    this.logger.log(
      `📧 Enviando correo de confirmación de reserva a ${email} para actividad ${data.activityName}`,
    );

    const template = this.loadTemplate('reservation-confirmation');
    const html = this.replaceVariables(template, data);

    await this.sendMail({
      to: email,
      subject: `Reserva confirmada: ${data.activityName} ✅`,
      html,
    });
  }

  async sendReservationCancellation(
    email: string,
    data: TurnCancellationData,
  ): Promise<void> {
    const template = this.loadTemplate('turn-cancellation');
    const html = this.replaceVariables(template, data);

    await this.sendMail({
      to: email,
      subject: `Reserva cancelada: ${data.activityName}`,
      html,
    });
  }

  async sendPaymentConfirmation(
    email: string,
    data: PaymentConfirmationData,
  ): Promise<void> {
    const template = this.loadTemplate('payment-confirmation');
    const html = this.replaceVariables(template, data);

    await this.sendMail({
      to: email,
      subject: `Pago confirmado: $${data.amount} ✅`,
      html,
    });
  }

  async sendPaymentAlert(email: string, data: PaymentAlertData): Promise<void> {
    const template = this.loadTemplate('payment-alert');
    const html = this.replaceVariables(template, data);

    await this.sendMail({
      to: email,
      subject: `⚠️ Recordatorio de pago - Vence ${data.dueDate}`,
      html,
    });
  }

  async sendTurnReminder(email: string, data: TurnReminderData): Promise<void> {
    const template = this.loadTemplate('turn-reminder');
    const html = this.replaceVariables(template, data);

    await this.sendMail({
      to: email,
      subject: `🔔 Recordatorio: ${data.activityName} mañana`,
      html,
    });
  }

  async sendTurnCancellationNotification(
    email: string,
    data: TurnCancellationData,
  ): Promise<void> {
    const template = this.loadTemplate('turn-cancellation');
    const html = this.replaceVariables(template, data);

    await this.sendMail({
      to: email,
      subject: `⚠️ Turno cancelado: ${data.activityName}`,
      html,
    });
  }

  async sendAdminNotification(
    email: string,
    data: AdminNotificationData,
  ): Promise<void> {
    const template = this.loadTemplate('admin-notification');
    const html = this.replaceVariables(template, data);

    await this.sendMail({
      to: email,
      subject: data.title,
      html,
    });
  }

  async sendBulkEmails(
    emails: string[],
    subject: string,
    data: AdminNotificationData,
  ): Promise<void> {
    const template = this.loadTemplate('admin-notification');
    const html = this.replaceVariables(template, data);

    const promises = emails.map((email) =>
      this.sendMail({
        to: email,
        subject,
        html,
      }),
    );

    await Promise.allSettled(promises);
    this.logger.log(`📧 Bulk email sent to ${emails.length} recipients`);
  }
}
