import { sendEmail } from '../sendEmail.js';
import { WelcomeEmail } from '../../../src/email/index.js';

export async function sendWelcomeEmail({ email, name, appUrl } = {}) {
  return sendEmail({
    to: email,
    subject: 'Bienvenido a Alaia',
    template: WelcomeEmail,
    props: { name, appUrl },
  });
}
