const nodemailer = require("nodemailer");
const { buildInvitationEmail } = require("./emailTemplate");

/**
 * Crea el transporter de Nodemailer basado en variables de entorno.
 * Si SMTP_USER esta vacio, no envia autenticacion (util para MailHog en desarrollo).
 */
function createTransporter() {
  const smtpUser = process.env.SMTP_USER || "";
  const transportOptions = {
    host: process.env.SMTP_HOST || "smtp.pacheco.cl",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true para 465, false para otros
  };

  // Solo incluir auth si hay usuario configurado
  if (smtpUser) {
    transportOptions.auth = {
      user: smtpUser,
      pass: process.env.SMTP_PASS || "",
    };
  }

  return nodemailer.createTransport(transportOptions);
}

/**
 * Envia un email de invitacion con link de activacion.
 * @param {object} params
 * @param {string} params.to - Email del destinatario
 * @param {string} params.nombre - Nombre completo del usuario
 * @param {string} params.token - Token de activacion
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendInvitationEmail({ to, nombre, token }) {
  const frontendUrl = process.env.FRONTEND_URL || "https://pacheco.cl";
  const from = process.env.SMTP_FROM || "noreply@pacheco.cl";

  const { subject, html } = buildInvitationEmail({ nombre, token, frontendUrl });

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { sendInvitationEmail };
