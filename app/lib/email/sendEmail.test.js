import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendEmail } from './sendEmail.js';
import { WelcomeEmail } from '../../src/email/index.js';

test('sendEmail devuelve error si faltan campos requeridos', async () => {
  const result = await sendEmail({ to: '', subject: '', template: null });
  assert.equal(result.success, false);
  assert.match(result.error, /requiere/);
});

test('sendEmail no rompe la app si no hay RESEND_API_KEY configurado', async () => {
  const original = process.env.RESEND_API_KEY;
  const originalFrom = process.env.EMAIL_FROM;
  delete process.env.RESEND_API_KEY;
  process.env.EMAIL_FROM = 'Alaia <noreply@alaia.cl>';

  const result = await sendEmail({
    to: 'test@alaia.cl',
    subject: 'Bienvenido a Alaia',
    template: WelcomeEmail,
    props: { name: 'Cami' },
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'Proveedor de email no configurado.');

  if (original) process.env.RESEND_API_KEY = original;
  else delete process.env.RESEND_API_KEY;
  if (originalFrom) process.env.EMAIL_FROM = originalFrom;
  else delete process.env.EMAIL_FROM;
});

test('sendEmail usa remitente, replyTo, tags e idempotency key configurados', async () => {
  const previous = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
    ENABLE_TRANSACTIONAL_EMAILS: process.env.ENABLE_TRANSACTIONAL_EMAILS,
  };
  process.env.RESEND_API_KEY = 'test_resend_key';
  process.env.EMAIL_FROM = 'Alaia <noreply@alaia.cl>';
  process.env.EMAIL_REPLY_TO = 'adminalaia@gmail.com';
  process.env.ENABLE_TRANSACTIONAL_EMAILS = 'true';

  let payload;
  const result = await sendEmail({
    to: 'kari@example.com',
    subject: 'Bienvenido a Alaia',
    template: WelcomeEmail,
    props: { name: 'Kari' },
    tags: [{ name: 'kind', value: 'test' }],
    idempotencyKey: 'email:test',
    resendClient: {
      emails: {
        send: async (input) => {
          payload = input;
          return { data: { id: 'email_123' }, error: null };
        },
      },
    },
  });

  assert.equal(result.success, true);
  assert.equal(payload.from, 'Alaia <noreply@alaia.cl>');
  assert.equal(payload.replyTo, 'adminalaia@gmail.com');
  assert.deepEqual(payload.tags, [{ name: 'kind', value: 'test' }]);
  assert.equal(payload.headers['Idempotency-Key'], 'email:test');

  for (const [key, value] of Object.entries(previous)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
});
