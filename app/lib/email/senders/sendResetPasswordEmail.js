import { sendEmail } from '../sendEmail.js';
import { ResetPasswordEmail } from '../../../src/email/index.js';

export async function sendResetPasswordEmail({ email, name, resetUrl, appUrl } = {}) {
  return sendEmail({
    to: email,
    subject: 'CambiÃ¡ tu contraseÃ±a de Alaia',
    template: ResetPasswordEmail,
    props: { name, resetUrl, appUrl },
  });
}
