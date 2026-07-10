import { sendEmail } from '../sendEmail.js';
import { DailyMomentEmail } from '../../../src/email/index.js';

export async function sendDailyMomentEmail({ email, name, memoryTitle, memoryText, imageUrl, appUrl } = {}) {
  return sendEmail({
    to: email,
    subject: memoryTitle ? `Un recuerdo: ${memoryTitle}` : 'Un recuerdo de tu viaje te está esperando',
    template: DailyMomentEmail,
    props: { name, memoryTitle, memoryText, imageUrl, appUrl },
  });
}
