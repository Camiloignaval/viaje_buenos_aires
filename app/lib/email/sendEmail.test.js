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
  delete process.env.RESEND_API_KEY;

  const result = await sendEmail({
    to: 'test@aurora.cl',
    subject: 'Bienvenido a Aurora',
    template: WelcomeEmail,
    props: { name: 'Cami' },
  });

  assert.equal(result.success, false);
  assert.equal(result.error, 'Proveedor de email no configurado.');

  if (original) process.env.RESEND_API_KEY = original;
});
