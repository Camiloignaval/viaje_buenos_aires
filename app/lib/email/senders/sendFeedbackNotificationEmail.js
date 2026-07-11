import { sendEmail } from '../sendEmail.js';
import { FeedbackNotificationEmail } from '../../../src/email/index.js';
import { getPlatformConfig } from '../../platformConfig.js';

export async function sendFeedbackNotificationEmail({ to, replyTo, feedback, user, idempotencyKey } = {}) {
  const config = getPlatformConfig();
  return sendEmail({
    to,
    subject: 'Nueva sugerencia en Alaia',
    template: FeedbackNotificationEmail,
    props: { feedback, user, appUrl: config.app.baseUrl },
    replyTo,
    tags: [{ name: 'notification_type', value: 'new_feedback' }],
    idempotencyKey,
  });
}
