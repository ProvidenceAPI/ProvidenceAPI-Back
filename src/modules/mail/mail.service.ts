import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
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

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    this.transporter = nodemailer.createTransport({
      host: isProduction ? 'smtp-relay.brevo.com' : 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
      });

    this.templatesPath = this.resolveTemplatesPath();

    this.verifyConnection();
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
    if (!process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
      this.logger.warn(
        '⚠️ Mail not configured (MAIL_USER/MAIL_PASSWORD missing). Emails will not be sent.',
      );
      return;
    }

    try {
      await this.transporter.verify();
      this.logger.log('✅ Mail server connection established with Gmail');
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
    if (!process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
      this.logger.warn(
        `⚠️ Mail not configured. Cannot send email to ${options.to}`,
      );
      throw new Error(
        'Mail service not configured. MAIL_USER and MAIL_PASSWORD are required.',
      );
    }

    try {
      const mailOptions = {
        from: `Providence Fitness <${process.env.MAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent to ${options.to}: ${info.messageId}`);
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to send email to ${options.to}:`,
        error?.message || error,
      );
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<void> {
    this.logger.log(`📧 Sending welcome email to ${email}`);
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
      `📧 Sending reservation confirmation to ${email} for activity ${data.activityName}`,
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
    this.logger.log(
      `📧 Sending cancellation notification to ${email} for activity ${data.activityName}`,
    );

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
    this.logger.log(`📧 Sending payment confirmation to ${email}`);

    const template = this.loadTemplate('payment-confirmation');
    const html = this.replaceVariables(template, data);

    await this.sendMail({
      to: email,
      subject: `✅ Pago confirmado - ${data.description}`,
      html,
    });
  }

  async sendPaymentAlert(email: string, data: PaymentAlertData): Promise<void> {
    this.logger.log(`📧 Sending payment alert to ${email}`);

    const template = this.loadTemplate('payment-alert');
    const html = this.replaceVariables(template, data);

    await this.sendMail({
      to: email,
      subject: '⚠️ Recordatorio de pago pendiente',
      html,
    });
  }

  async sendTurnReminder(email: string, data: TurnReminderData): Promise<void> {
    this.logger.log(`📧 Sending turn reminder to ${email}`);

    const template = this.loadTemplate('turn-reminder');
    const html = this.replaceVariables(template, data);

    await this.sendMail({
      to: email,
      subject: `🔔 Recordatorio: ${data.activityName} mañana`,
      html,
    });
  }

  async sendAdminNotification(
    email: string,
    data: AdminNotificationData,
  ): Promise<void> {
    this.logger.log(`📧 Sending admin notification to ${email}`);

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
    this.logger.log(`📧 Sending bulk emails to ${emails.length} recipients`);

    const template = this.loadTemplate('admin-notification');
    const html = this.replaceVariables(template, data);

    const promises = emails.map((email) =>
      this.sendMail({
        to: email,
        subject,
        html,
      }).catch((err) => {
        this.logger.error(`Error sending email to ${email}:`, err);
      }),
    );

    await Promise.allSettled(promises);
    this.logger.log(
      `✅ Bulk email process completed for ${emails.length} recipients`,
    );
  }
}
