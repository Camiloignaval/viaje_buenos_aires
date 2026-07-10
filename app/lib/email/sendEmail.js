import { getResendClient, getEmailFrom, isEmailConfigured } from './resend.js';
import { renderTemplate } from './templates.js';

// Primitiva única de envío: renderiza un template de React Email y lo manda
// por Resend. No conoce reglas de negocio — solo recibe destinatario,
// asunto, el componente de template y sus props.
export async function sendEmail({ to, subject, template, props = {} }) {
  if (!to || !subject || !template) {
    return { success: false, error: "sendEmail requiere 'to', 'subject' y 'template'." };
  }

  if (!isEmailConfigured()) {
    console.error(`[email] RESEND_API_KEY no configurado, no se pudo enviar: "${subject}" a ${to}`);
    return { success: false, error: 'Proveedor de email no configurado.' };
  }

  try {
    const { html, text } = await renderTemplate(template, props);
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({ from: getEmailFrom(), to, subject, html, text });

    if (error) {
      console.error('[email] Resend rechazó el envío:', error);
      return { success: false, error: error.message ?? 'Resend rechazó el envío.' };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('[email] Error inesperado al enviar:', error);
    return { success: false, error: error.message ?? 'Error inesperado al enviar el correo.' };
  }
}
