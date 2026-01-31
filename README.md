#🏋️ Providence Fitness API

### Sistema Integral de Gestión de Turnos para Gimnasios
Backend API desarrollada para digitalizar y centralizar la gestión operativa de gimnasios multiactividad: reservas de turnos, pagos mensuales por actividad, usuarios, roles y notificaciones automáticas.
## 📌 Caso de negocio

Los gimnasios pequeños suelen gestionar reservas y pagos de forma manual o con sistemas desactualizados, lo que genera errores en cupos, falta de seguimiento de pagos y una experiencia fragmentada tanto para clientes como administradores.
Providence Fitness API nace para resolver este problema mediante una solución centralizada que permite:
Gestión de actividades y turnos
Pagos mensuales independientes por actividad
Notificaciones automáticas
Roles y permisos
Panel administrativo completo
El sistema está pensado para gimnasios donde un usuario puede inscribirse en múltiples actividades simultáneamente, cada una con su propio ciclo de pago.

## 🚀 Funcionalidades principales

Autenticación propia (JWT) y externa (Google – Auth0)
Sistema de roles: Visitante, Usuario, Administrador y Super Admin
Gestión de actividades y turnos
Reservas con control de cupos
Pagos mensuales por actividad (MercadoPago)
Notificaciones automáticas por email
Subida de imágenes (Cloudinary)
Procesos automáticos con cron jobs
Documentación de API con Swagger

## 🛠️ Stack tecnológico
Backend: Node.js · NestJS · TypeScript
Base de datos: PostgreSQL
Autenticación: JWT · Auth0
Pagos: MercadoPago
Emails: Nodemailer
Archivos: Multer + Cloudinary
Cron jobs: node-cron
Documentación: Swagger (OpenAPI)

## 🔐 Autenticación y roles
Autenticación propia
Registro y login con email y contraseña
Contraseñas hasheadas con bcrypt
JWT almacenado en cookies httpOnly
Autenticación externa
Login con Google mediante Auth0
Roles y permisos
Usuario no registrado: acceso al catálogo
Usuario registrado: reservas, pagos y perfil
Administrador: gestión de actividades, turnos y usuarios
Super Admin: control total del sistema
Middleware de autorización protege las rutas según rol.

## 📧 Notificaciones por email
Se envían emails automáticos en los siguientes casos:
Confirmación de registro
Confirmación de reserva
Confirmación de pago
Cancelación de turnos
Recordatorios de clases
Avisos de vencimiento de pagos
Emails con templates HTML responsive.

## 💳 Pagos con MercadoPago
Cada actividad tiene su propio ciclo de pago mensual.
Flujo de pago
El usuario selecciona una actividad con pago pendiente
El backend crea una preferencia de pago
Redirección a checkout de MercadoPago
Webhook notifica el resultado del pago
Se actualiza el estado en base de datos
Se extiende la vigencia por 30 días
Se envía email de confirmación

## ⏱️ Procesos automáticos (Cron Jobs)
Recordatorio de turnos (24 h antes)
Alerta de vencimiento de pagos
Notificación de nuevas actividades
Avisos por feriados o promociones

## 📂 Subida de archivos
Fotos de perfil
Imágenes de actividades
Almacenamiento en Cloudinary
Límite: 1MB por archivo

## 📑 Documentación de la API
La API está documentada con Swagger.
URL: /api-docs
Incluye:
Endpoints
Métodos HTTP
Parámetros
Ejemplos de request/response
Esquemas de datos

## ⚙️ Instalación y ejecución
Requisitos: 
Node.js (v18+)
PostgreSQL
Cuenta en Cloudinary
Cuenta en MercadoPago
Credenciales de Auth0

1. Clonar el repositorio
git clone https://github.com/tu-usuario/providence-fitness-api.git
cd providence-fitness-api

2. Instalar dependencias
npm install

3. Configurar variables de entorno

*Crear un archivo .env:*

PORT=3001
NODE_ENV=development
DATABASE_URL=

DB_NAME=
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=

JWT_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

FRONTEND_URL=http://localhost:3000

MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=

API_URL=http://localhost:3001
PUBLIC_API_URL=

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=
MAIL_ENCRYPTION=tls

4. Levantar el servidor
npm run start:dev

5. La API estará disponible en:

http://localhost:3001

## 🚀 Deployment

Backend: Railway / Render
Base de datos: PostgreSQL (Railway / Render)
Archivos: Cloudinary
CI/CD: Integración con GitHub
