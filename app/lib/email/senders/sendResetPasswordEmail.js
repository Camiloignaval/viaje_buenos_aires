import { sendEmail } from '../sendEmail.js';
import { ResetPasswordEmail } from '../../../src/email/index.js';

export async function sendResetPasswordEmail({ email, name, resetUrl, appUrl } = {}) {
  return sendEmail({
    to: email,
    subject: 'Cambia tu contraseña de Alaia',
    template: ResetPasswordEmail,
    props: { name, resetUrl, appUrl },
  });
}
