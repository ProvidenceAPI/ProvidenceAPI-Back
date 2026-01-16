import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
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
  private readonly logger = new Logger(MailService.name);
  private readonly templatesPath: string;

  constructor(private readonly configService: ConfigService) {
    const mailConfig = getMailConfig(configService);
    this.transporter = nodemailer.createTransport(mailConfig);
    this.templatesPath = path.join(__dirname, 'templates');

    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Mail server connection established');
    } catch (error) {
      this.logger.error('❌ Mail server connection failed:', error.message);
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
      result = result.replace(regex, data[key] || '');
    });
    return result;
  }

  private async sendMail(options: MailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `Providence Fitness <${this.configService.get('MAIL_FROM')}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent to ${options.to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send email to ${options.to}:`,
        error.message,
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
