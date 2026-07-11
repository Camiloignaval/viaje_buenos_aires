import { sendEmail } from '../sendEmail.js';
import { VerifyEmail } from '../../../src/email/index.js';

export async function sendVerifyEmail({ email, name, code, verifyUrl, appUrl } = {}) {
  return sendEmail({
    to: email,
    subject: 'ConfirmÃ¡ tu correo en Alaia',
    template: VerifyEmail,
    props: { name, code, verifyUrl, appUrl },
  });
}
