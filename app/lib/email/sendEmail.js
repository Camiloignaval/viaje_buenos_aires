import { getResendClient, getEmailFrom, getDefaultReplyTo, isEmailConfigured } from './resend.js';
import { renderTemplate } from './templates.js';
import { FEATURE_FLAGS, isFeatureEnabled } from '../platformFlags.js';

// Primitiva única de envío: renderiza un template de React Email y lo manda
// por Resend. No conoce reglas de negocio: solo destinatario, asunto,
// template, props y metadatos de entrega.
export async function sendEmail({
  to,
  subject,
  template,
  props = {},
  replyTo,
  tags = [],
  idempotencyKey,
  resendClient,
} = {}) {
  if (!to || !subject || !template) {
    return { success: false, error: "sendEmail requiere 'to', 'subject' y 'template'." };
  }

  if (!isFeatureEnabled(FEATURE_FLAGS.TRANSACTIONAL_EMAILS)) {
    return { success: false, skipped: true, reason: 'TRANSACTIONAL_EMAILS_DISABLED' };
  }

  if (!isEmailConfigured()) {
    console.error('[email] Proveedor no configurado.', { subject, to });
    return { success: false, error: 'Proveedor de email no configurado.' };
  }

  try {
    const { html, text } = await renderTemplate(template, props);
    const resend = resendClient ?? getResendClient();
    const payload = {
      from: getEmailFrom(),
      to,
      subject,
      html,
      text,
      ...(replyTo || getDefaultReplyTo() ? { replyTo: replyTo ?? getDefaultReplyTo() } : {}),
      ...(Array.isArray(tags) && tags.length > 0 ? { tags } : {}),
      ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
    };

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error('[email] Resend rechazó el envío.', {
        subject,
        to,
        error: error.message ?? 'unknown',
        idempotencyKey,
      });
      return { success: false, error: error.message ?? 'Resend rechazó el envío.' };
    }

    console.info('[email] Correo enviado.', { subject, to, id: data?.id, idempotencyKey });
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('[email] Error inesperado al enviar.', {
      subject,
      to,
      error: error.message ?? 'unknown',
      idempotencyKey,
    });
    return { success: false, error: error.message ?? 'Error inesperado al enviar el correo.' };
  }
}
