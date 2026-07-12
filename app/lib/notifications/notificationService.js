import crypto from 'node:crypto';
import { getPlatformConfig } from '../platformConfig.js';
import { FEATURE_FLAGS, isFeatureEnabled } from '../platformFlags.js';
import { getNotificationDeliveriesCollection } from '../platformMongo.js';
import { sendFeedbackNotificationEmail } from '../email/senders/sendFeedbackNotificationEmail.js';
import { sendFeedbackReceivedEmail } from '../email/senders/sendFeedbackReceivedEmail.js';

export const NOTIFICATION_TYPES = Object.freeze({
  NEW_FEEDBACK: 'NEW_FEEDBACK',
  EMAIL_DELIVERY_FAILED: 'EMAIL_DELIVERY_FAILED',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
  CRITICAL_ERROR: 'CRITICAL_ERROR',
});

export const NOTIFICATION_CHANNELS = Object.freeze({
  EMAIL: 'email',
  IN_APP: 'in_app',
});

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function feedbackNotificationKeys(feedbackId) {
  return {
    internal: `feedback:${feedbackId}:internal`,
    user: `feedback:${feedbackId}:user`,
  };
}

async function markDeliveryStarted({ idempotencyKey, type, channel, to, now = new Date().toISOString() }) {
  const deliveries = await getNotificationDeliveriesCollection();
  await deliveries.createIndex({ idempotencyKey: 1 }, { unique: true });

  let result;
  try {
    result = await deliveries.updateOne(
      { idempotencyKey },
      {
        $setOnInsert: {
          idempotencyKey,
          type,
          channel,
          toHash: hash(to),
          status: 'processing',
          createdAt: now,
        },
        $set: { updatedAt: now },
      },
      { upsert: true }
    );
  } catch (error) {
    if (error?.code === 11000) return false;
    throw error;
  }

  return result.upsertedCount === 1;
}

async function markDeliveryResult({ idempotencyKey, result, now = new Date().toISOString() }) {
  const deliveries = await getNotificationDeliveriesCollection();
  await deliveries.updateOne(
    { idempotencyKey },
    {
      $set: {
        status: result.success ? 'sent' : result.skipped ? 'skipped' : 'failed',
        providerMessageId: result.id ?? null,
        error: result.error ?? result.reason ?? null,
        updatedAt: now,
        completedAt: now,
      },
    }
  );
}

async function sendOnce({ idempotencyKey, type, to, send }) {
  const shouldSend = await markDeliveryStarted({ idempotencyKey, type, channel: NOTIFICATION_CHANNELS.EMAIL, to });
  if (!shouldSend) return { success: true, skipped: true, reason: 'DUPLICATE_NOTIFICATION' };

  const result = await send();
  await markDeliveryResult({ idempotencyKey, result });
  return result;
}

export async function notifyNewFeedback({ feedback, user }) {
  const config = getPlatformConfig();
  if (!isFeatureEnabled(FEATURE_FLAGS.FEEDBACK_NOTIFICATIONS, { config })) {
    return { success: true, skipped: true, reason: 'FEEDBACK_NOTIFICATIONS_DISABLED' };
  }

  const keys = feedbackNotificationKeys(feedback.id);
  const results = [];

  if (config.email.feedbackNotificationEmail) {
    results.push(
      await sendOnce({
        idempotencyKey: keys.internal,
        type: NOTIFICATION_TYPES.NEW_FEEDBACK,
        to: config.email.feedbackNotificationEmail,
        send: () =>
          sendFeedbackNotificationEmail({
            to: config.email.feedbackNotificationEmail,
            replyTo: user.email,
            feedback,
            user,
            idempotencyKey: keys.internal,
          }),
      })
    );
  }

  if (user.email) {
    results.push(
      await sendOnce({
        idempotencyKey: keys.user,
        type: NOTIFICATION_TYPES.NEW_FEEDBACK,
        to: user.email,
        send: () =>
          sendFeedbackReceivedEmail({
            email: user.email,
            name: user.displayName,
            idempotencyKey: keys.user,
          }),
      })
    );
  }

  return { success: results.every((result) => result.success || result.skipped), results };
}

export async function notify(type, payload) {
  if (type === NOTIFICATION_TYPES.NEW_FEEDBACK) {
    return notifyNewFeedback(payload);
  }
  return { success: false, skipped: true, reason: 'NOTIFICATION_TYPE_NOT_IMPLEMENTED' };
}
