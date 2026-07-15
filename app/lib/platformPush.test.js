import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PUSH_PREFERENCES, TEST_PUSH_PAYLOAD, normalizePushPreferences, parsePushSubscription } from './platformPush.js';

test('parsePushSubscription acepta solo endpoints HTTPS y claves Web Push', () => {
  const subscription = parsePushSubscription({ endpoint: 'https://push.example.test/subscription', keys: { p256dh: 'abc_DEF-123', auth: 'abc_DEF-123' } });
  assert.equal(subscription.endpoint, 'https://push.example.test/subscription');
  assert.throws(() => parsePushSubscription({ endpoint: 'http://push.example.test', keys: { p256dh: 'a', auth: 'b' } }));
});

test('preferencias de acompañamiento se normalizan sin reactivar consentimiento', () => {
  assert.deepEqual(normalizePushPreferences(), DEFAULT_PUSH_PREFERENCES);
  assert.deepEqual(normalizePushPreferences({ enabled: true, beforeTrip: false, futureMemories: true }), { enabled: true, beforeTrip: false, duringTrip: true, afterTrip: true, futureMemories: true });
  assert.deepEqual(TEST_PUSH_PAYLOAD, { title: 'Alaia está contigo', body: 'Cuando haya algo que merezca quedarse, sabremos cómo encontrarte.', path: '/trips' });
});
