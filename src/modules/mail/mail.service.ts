import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import sgMail from '@sendgrid/mail';
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

const WELCOME_INLINE_IMAGES: Array<{
  file: string;
  contentId: string;
  type: string;
}> = [
  { file: 'logo.png', contentId: 'logo', type: 'image/png' },
  { file: 'welcome.jpg', contentId: 'welcome', type: 'image/jpeg' },
  { file: 'facebook.png', contentId: 'facebook', type: 'image/png' },
  { file: 'instagram.png', contentId: 'instagram', type: 'image/png' },
  { file: 'x.png', contentId: 'x', type: 'image/png' },
];

@Injectable()
export class MailService {
  private transporter: Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly templatesPath: string;
  private readonly assetsEmailPath: string;
  private readonly isProduction: boolean;

  constructor() {
    this.isProduction =
      (process.env.NODE_ENV || '').toLowerCase() === 'production';

    if (this.isProduction) {
      this.logger.log('📧 Initializing SendGrid API for production');
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        this.logger.error('⚠️ SENDGRID_API_KEY not configured in production!');
      } else {
        sgMail.setApiKey(apiKey);
      }
    } else {
      this.logger.log('📧 Initializing Gmail SMTP for development');
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        },
      });
      this.verifyConnection();
    }

    this.templatesPath = this.resolveTemplatesPath();
    this.assetsEmailPath = path.join(
      path.dirname(this.templatesPath),
      'assets',
      'email',
    );
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

  /**
   * Carga imágenes desde assets/email para incrustarlas inline en SendGrid.
   * Si todas existen, devuelve adjuntos y datos con cid:; si no, null.
   */
  private loadWelcomeInlineAttachments(): {
    attachments: NonNullable<MailOptions['attachments']>;
    dataOverrides: Partial<WelcomeEmailData>;
  } | null {
    if (!fs.existsSync(this.assetsEmailPath)) {
      return null;
    }
    const attachments: NonNullable<MailOptions['attachments']> = [];
    const dataOverrides: Partial<WelcomeEmailData> = {};
    for (const { file, contentId, type } of WELCOME_INLINE_IMAGES) {
      const filePath = path.join(this.assetsEmailPath, file);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const buf = fs.readFileSync(filePath);
      const base64 = buf.toString('base64');
      attachments.push({
        filename: file,
        content: base64,
        type,
        disposition: 'inline',
        content_id: contentId,
      });
      const urlKey =
        contentId === 'logo'
          ? 'logoUrl'
          : contentId === 'welcome'
            ? 'welcomeImageUrl'
            : contentId === 'facebook'
              ? 'facebookIconUrl'
              : contentId === 'instagram'
                ? 'instagramIconUrl'
                : 'xIconUrl';
      (dataOverrides as Record<string, string>)[urlKey] = `cid:${contentId}`;
    }
    return { attachments, dataOverrides };
  }

  /**
   * Punto único de envío: en producción usa SendGrid; en desarrollo usa Gmail.
   * Todos los correos (welcome, reservas, pagos, recordatorios, admin, etc.)
   * pasan por aquí.
   */
  private async sendMail(options: MailOptions): Promise<void> {
    if (this.isProduction) {
      return this.sendMailWithSendGrid(options);
    }
    return this.sendMailWithGmail(options);
  }

  private async sendMailWithGmail(options: MailOptions): Promise<void> {
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
      this.logger.log(
        `✅ Email sent via Gmail to ${options.to}: ${info.messageId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to send email to ${options.to}:`,
        error?.message || error,
      );
      throw error;
    }
  }

  private async sendMailWithSendGrid(options: MailOptions): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) {
      this.logger.warn(
        `⚠️ SendGrid API key not configured. Cannot send email to ${options.to}`,
      );
      throw new Error('SENDGRID_API_KEY is required in production.');
    }

    try {
      const msg: Record<string, unknown> = {
        to: options.to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'providenceapi@gmail.com',
          name: 'Providence Fitness',
        },
        subject: options.subject,
        html: options.html,
      };
      if (options.attachments?.length) {
        msg.attachments = options.attachments.map((a) => {
          const content =
            typeof a.content === 'string'
              ? a.content
              : a.content instanceof Buffer
                ? a.content.toString('base64')
                : '';
          return {
            content,
            filename: a.filename,
            type: a.type || 'image/png',
            disposition: a.disposition || 'attachment',
            content_id: a.content_id,
          };
        });
      }
      const result = await sgMail.send(
        msg as unknown as Parameters<typeof sgMail.send>[0],
      );
      this.logger.log(
        `✅ Email sent via SendGrid to ${options.to}: ${result[0].statusCode}`,
      );
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to send email via SendGrid to ${options.to}:`,
        error?.message || error?.response?.body || error,
      );
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<void> {
    this.logger.log(`📧 Sending welcome email to ${email}`);
    const template = this.loadTemplate('welcome');
    let finalData = { ...data };
    let attachments: MailOptions['attachments'];
    if (this.isProduction) {
      const inline = this.loadWelcomeInlineAttachments();
      if (inline) {
        finalData = { ...data, ...inline.dataOverrides };
        attachments = inline.attachments;
        this.logger.log(
          `📎 Using ${attachments.length} inline images for welcome email`,
        );
      }
    }
    const html = this.replaceVariables(template, finalData);
    await this.sendMail({
      to: email,
      subject: '¡Bienvenido a Providence Fitness! 🏋️',
      html,
      attachments,
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

  async sendTurnCancellationNotification(
    email: string,
    data: TurnCancellationData,
  ): Promise<void> {
    return this.sendReservationCancellation(email, data);
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
