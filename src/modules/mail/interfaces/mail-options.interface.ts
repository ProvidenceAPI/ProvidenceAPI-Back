export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    type?: string;
    disposition?: 'inline' | 'attachment';
    content_id?: string;
  }>;
}

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  userPhone: string;
  userDNI: string;
  frontendUrl: string;
  logoUrl?: string;
  welcomeImageUrl?: string;
  facebookIconUrl?: string;
  instagramIconUrl?: string;
  xIconUrl?: string;
}

export interface ReservationConfirmationData {
  userName: string;
  activityName: string;
  activityImage?: string;
  turnDate: string;
  turnTime: string;
  endTime: string;
  instructor?: string;
  location: string;
  frontendUrl: string;
}

export interface PaymentConfirmationData {
  userName: string;
  activityName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string;
  description: string;
  reservationDate: string;
  reservationTime: string;
  frontendUrl: string;
}

export interface TurnCancellationData {
  userName: string;
  activityName: string;
  turnDate: string;
  turnTime: string;
  reason: string;
  refundInfo?: string;
  frontendUrl?: string;
}

export interface TurnReminderData {
  userName: string;
  activityName: string;
  turnDate: string;
  turnTime: string;
  location: string;
  frontendUrl?: string;
}

export interface PaymentAlertData {
  userName: string;
  activityName: string;
  amount: number;
  dueDate: string;
  paymentUrl: string;
}

export interface AdminNotificationData {
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}
