import { sendEmail } from '../sendEmail.js';
import { VerifyEmail } from '../../../src/email/index.js';

export async function sendVerifyEmail({ email, name, code, verifyUrl, appUrl } = {}) {
  return sendEmail({
    to: email,
    subject: 'Confirmá tu correo en Aurora',
    template: VerifyEmail,
    props: { name, code, verifyUrl, appUrl },
  });
}
