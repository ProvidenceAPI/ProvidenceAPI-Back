import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../src/modules/mail/mail.module';
import { MailService } from '../src/modules/mail/mail.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    MailModule,
  ],
})
class TestMailAppModule {}

const FRONTEND_URL = 'http://localhost:3001';

async function run() {
  const to =
    process.env.TEST_MAIL_TO || process.argv[2] || process.env.MAIL_USER;

  if (!to) {
    console.error(
      '❌ Indica el email destinatario: TEST_MAIL_TO, argumento (tu@email.com) o MAIL_USER',
    );
    process.exit(1);
  }

  console.log(`\n📧 Enviando correos de prueba a: ${to}\n`);

  const app = await NestFactory.createApplicationContext(TestMailAppModule);
  const mail = app.get(MailService);

  const samples = [
    {
      name: 'Welcome (Bienvenida)',
      fn: () =>
        mail.sendWelcomeEmail(to, {
          userName: 'Usuario Prueba',
          userEmail: to,
          userPhone: '+54 11 1234-5678',
          userDNI: '12345678',
          frontendUrl: FRONTEND_URL,
        }),
    },
    {
      name: 'Reservation Confirmation (Reserva confirmada)',
      fn: () =>
        mail.sendReservationConfirmation(to, {
          userName: 'Usuario Prueba',
          activityName: 'Yoga',
          turnDate: 'lunes, 15 de enero de 2026',
          turnTime: '10:00',
          endTime: '11:00',
          instructor: 'María García',
          location: 'Provincia de Buenos Aires 760',
          frontendUrl: FRONTEND_URL,
        }),
    },
    {
      name: 'Reservation Cancellation (Reserva cancelada)',
      fn: () =>
        mail.sendReservationCancellation(to, {
          userName: 'Usuario Prueba',
          activityName: 'Yoga',
          turnDate: 'lunes, 15 de enero de 2026',
          turnTime: '10:00',
          reason: 'Cancelado por el usuario',
          refundInfo:
            'Puedes reprogramar tu clase sin costo adicional. Visita tu panel de reservas.',
          frontendUrl: FRONTEND_URL,
        }),
    },
    {
      name: 'Payment Confirmation (Pago confirmado)',
      fn: () =>
        mail.sendPaymentConfirmation(to, {
          userName: 'Usuario Prueba',
          activityName: 'Suscripción Yoga',
          amount: 5000,
          paymentDate: '15 de enero de 2026',
          paymentMethod: 'MercadoPago',
          transactionId: 'MP-123456',
          description: 'Pago de suscripción mensual',
          reservationDate: 'N/A',
          reservationTime: 'N/A',
          frontendUrl: FRONTEND_URL,
        }),
    },
    {
      name: 'Payment Alert (Recordatorio de pago)',
      fn: () =>
        mail.sendPaymentAlert(to, {
          userName: 'Usuario Prueba',
          activityName: 'Yoga',
          amount: 5000,
          dueDate: 'viernes, 18 de enero de 2026',
          paymentUrl: `${FRONTEND_URL}/subscriptions/xxx/renew`,
        }),
    },
    {
      name: 'Turn Reminder (Recordatorio de turno)',
      fn: () =>
        mail.sendTurnReminder(to, {
          userName: 'Usuario Prueba',
          activityName: 'Yoga',
          turnDate: 'martes, 16 de enero de 2026',
          turnTime: '10:00',
          location: 'Provincia de Buenos Aires 760',
          frontendUrl: FRONTEND_URL,
        }),
    },
    {
      name: 'Turn Cancellation (Turno cancelado)',
      fn: () =>
        mail.sendReservationCancellation(to, {
          userName: 'Usuario Prueba',
          activityName: 'Yoga',
          turnDate: '15/1/2026',
          turnTime: '10:00',
          reason: 'Cancelación administrativa del turno',
          refundInfo:
            'Puedes reprogramar tu clase. Tu suscripción permanece activa.',
          frontendUrl: FRONTEND_URL,
        }),
    },
    {
      name: 'Admin Notification (Notificación administrativa)',
      fn: () =>
        mail.sendAdminNotification(to, {
          title: '¡Nueva Actividad Disponible!',
          message:
            'Te invitamos a conocer nuestra nueva clase de Pilates.\n\nHorarios: Lun y Mié 18:00.',
          actionUrl: `${FRONTEND_URL}/activities`,
          actionText: 'VER ACTIVIDADES',
        }),
    },
  ];

  let ok = 0;
  let fail = 0;

  for (const { name, fn } of samples) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      ok++;
    } catch (e: any) {
      console.log(`  ❌ ${name}: ${e?.message || e}`);
      fail++;
    }
  }

  console.log(`\n📬 Resumen: ${ok} enviados, ${fail} fallidos.\n`);
  await app.close();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
