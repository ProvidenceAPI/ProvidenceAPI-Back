# Imágenes del correo de bienvenida (SendGrid)

Para que las imágenes del template de bienvenida se vean al enviar con **SendGrid**, coloca aquí estos archivos (mismos nombres y formato):

| Archivo       | Uso en el correo                          |
|---------------|--------------------------------------------|
| `logo.png`    | Logo de Providence Fitness (cabecera)      |
| `welcome.jpg` | Imagen de bienvenida debajo del logo       |
| `facebook.png`| Icono de Facebook (pie de correo)          |
| `instagram.png`| Icono de Instagram (pie de correo)        |
| `x.png`       | Icono de X / Twitter (pie de correo)       |

El backend los incrusta como **adjuntos inline** (CID) en el correo, así que se muestran aunque el cliente bloquee imágenes externas.

Si falta alguno de estos archivos, se usarán las URLs por defecto (Stripocdn); en muchos clientes esas URLs pueden bloquearse. Por eso se recomienda tener los cinco archivos en esta carpeta en producción.
