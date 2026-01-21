
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.development') });

async function testEmailConnection() {
  console.log('🔍 Probando conexión con Gmail...\n');

  console.log('Configuración:');
  console.log('- Host:', process.env.MAIL_HOST);
  console.log('- Port:', process.env.MAIL_PORT);
  console.log('- User:', process.env.MAIL_USER);
  console.log(
    '- Password:',
    process.env.MAIL_PASSWORD ? '✓ Configurada' : '✗ No configurada',
  );
  console.log('- From:', process.env.MAIL_FROM);
  console.log('\n');


  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false, 
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  try {
   
    console.log('⏳ Verificando conexión SMTP...');
    await transporter.verify();
    console.log('✅ Conexión exitosa!\n');

   
    console.log('📧 Enviando email de prueba...');
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_USER, // Se envía a sí mismo para probar
      subject: '✅ Prueba de Contraseña de Aplicación - Providence API',
      html: `
        <h1>¡Configuración Exitosa! 🎉</h1>
        <p>La contraseña de aplicación de Gmail está funcionando correctamente.</p>
        <p><strong>Detalles:</strong></p>
        <ul>
          <li>Servidor: ${process.env.MAIL_HOST}</li>
          <li>Puerto: ${process.env.MAIL_PORT}</li>
          <li>Usuario: ${process.env.MAIL_USER}</li>
        </ul>
        <p>Ya puedes usar esta configuración en Providence API.</p>
      `,
    });

    console.log('✅ Email enviado exitosamente!');
    console.log('📬 Message ID:', info.messageId);
    console.log('\n✨ Todo funciona correctamente!');
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 Sugerencias:');
    console.log('1. Verifica que la contraseña NO tenga espacios en el .env');
    console.log('2. Asegúrate de que la autenticación de 2 pasos esté activa');
    console.log('3. Verifica que la contraseña de aplicación sea válida');
  }
}

testEmailConnection();
