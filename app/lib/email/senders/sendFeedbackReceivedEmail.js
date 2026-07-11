import { sendEmail } from '../sendEmail.js';
import { FeedbackReceivedEmail } from '../../../src/email/index.js';
import { getPlatformConfig } from '../../platformConfig.js';

export async function sendFeedbackReceivedEmail({ email, name, idempotencyKey } = {}) {
  const config = getPlatformConfig();
  return sendEmail({
    to: email,
    subject: 'Recibimos tu mensaje',
    template: FeedbackReceivedEmail,
    props: { name, appUrl: config.app.baseUrl },
    tags: [{ name: 'notification_type', value: 'feedback_received' }],
    idempotencyKey,
  });
}
