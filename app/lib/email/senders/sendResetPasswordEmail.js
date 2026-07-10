import { sendEmail } from '../sendEmail.js';
import { ResetPasswordEmail } from '../../../src/email/index.js';

export async function sendResetPasswordEmail({ email, name, resetUrl, appUrl } = {}) {
  return sendEmail({
    to: email,
    subject: 'Cambiá tu contraseña de Aurora',
    template: ResetPasswordEmail,
    props: { name, resetUrl, appUrl },
  });
}
