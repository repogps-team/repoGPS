/**
 * Construye el template HTML del email de invitacion.
 * @param {object} params
 * @param {string} params.nombre - Nombre completo del usuario
 * @param {string} params.token - Token de activacion
 * @param {string} params.frontendUrl - URL del frontend (ej: https://pacheco.cl)
 * @returns {{ subject: string, html: string }}
 */
function buildInvitationEmail({ nombre, token, frontendUrl }) {
  const activationLink = `${frontendUrl}/activar?token=${token}`;

  const subject = "Bienvenido a repoGPS — Activa tu cuenta";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #1a73e8;
      color: white;
      padding: 24px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .body {
      padding: 32px;
      color: #333333;
      line-height: 1.6;
    }
    .body p {
      margin: 0 0 16px 0;
    }
    .button-container {
      text-align: center;
      margin: 24px 0;
    }
    .button {
      display: inline-block;
      background-color: #1a73e8;
      color: white !important;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
    }
    .link-fallback {
      margin-top: 16px;
      font-size: 12px;
      color: #888888;
      word-break: break-all;
    }
    .footer {
      padding: 16px 32px;
      background-color: #f8f9fa;
      font-size: 12px;
      color: #888888;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .expiry-notice {
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 12px 16px;
      margin: 16px 0;
      font-size: 14px;
      color: #856404;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>repoGPS</h1>
    </div>
    <div class="body">
      <p>Hola <strong>${nombre}</strong>,</p>
      <p>Se cre&oacute; tu cuenta en <strong>repoGPS</strong>. Para empezar a usar la plataforma, activa tu cuenta haciendo clic en el siguiente bot&oacute;n:</p>

      <div class="button-container">
        <a href="${activationLink}" class="button" target="_blank">Activar mi cuenta</a>
      </div>

      <div class="link-fallback">
        O copia este link en tu navegador:<br>
        <a href="${activationLink}" target="_blank">${activationLink}</a>
      </div>

      <div class="expiry-notice">
        ⚠️ Este link expira en <strong>48 horas</strong>. Si no activas tu cuenta a tiempo, solicita una nueva invitaci&oacute;n al administrador.
      </div>
    </div>
    <div class="footer">
      <p>repoGPS — Sistema de Gesti&oacute;n de Proyectos</p>
      <p>Este es un correo autom&aacute;tico, por favor no respondas a este mensaje.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

module.exports = { buildInvitationEmail };
