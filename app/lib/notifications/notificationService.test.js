import assert from 'node:assert/strict';
import test from 'node:test';
import { feedbackNotificationKeys, NOTIFICATION_TYPES, NOTIFICATION_CHANNELS } from './notificationService.js';

test('feedbackNotificationKeys separa confirmación interna y usuario', () => {
  assert.deepEqual(feedbackNotificationKeys('abc'), {
    internal: 'feedback:abc:internal',
    user: 'feedback:abc:user',
  });
});

test('NotificationService expone contratos mínimos extensibles', () => {
  assert.equal(NOTIFICATION_TYPES.NEW_FEEDBACK, 'NEW_FEEDBACK');
  assert.equal(NOTIFICATION_CHANNELS.EMAIL, 'email');
  assert.equal(NOTIFICATION_CHANNELS.IN_APP, 'in_app');
});
