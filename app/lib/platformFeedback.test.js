import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertUserCanSendFeedback,
  normalizeFeedbackInput,
  publicFeedback,
} from './platformFeedback.js';
import { EmailNotVerifiedError, IncompleteProfileError, ValidationError } from './platformErrors.js';

test('normalizeFeedbackInput acepta solo categoría y mensaje visibles', () => {
  const input = normalizeFeedbackInput({
    category: 'suggestion',
    message: '  Me gustaría una vista más clara. <script> ',
    pageUrl: 'https://alaia.cl/trips',
    browser: 'Firefox',
  });

  assert.equal(input.category, 'sugerencia');
  assert.equal(input.message, 'Me gustaría una vista más clara. script');
  assert.equal(input.pageUrl, 'https://alaia.cl/trips');
});

test('normalizeFeedbackInput rechaza categoría y mensaje inválidos', () => {
  assert.throws(() => normalizeFeedbackInput({ category: 'x', message: 'mensaje válido' }), ValidationError);
  assert.throws(() => normalizeFeedbackInput({ category: 'suggestion', message: 'corto' }), ValidationError);
});

test('assertUserCanSendFeedback exige email verificado y perfil completo', () => {
  assert.throws(
    () => assertUserCanSendFeedback({ displayName: 'Kari', residenceCountryCode: 'CL', onboardingCompleted: true }),
    EmailNotVerifiedError
  );
  assert.throws(
    () => assertUserCanSendFeedback({ emailVerifiedAt: '2026-07-11T00:00:00.000Z', onboardingCompleted: true }),
    IncompleteProfileError
  );
});

test('publicFeedback no expone mensaje ni identidad', () => {
  assert.deepEqual(
    publicFeedback({ _id: 'f1', status: 'new', createdAt: '2026-07-11T00:00:00.000Z', message: 'privado' }),
    { id: 'f1', status: 'new', createdAt: '2026-07-11T00:00:00.000Z' }
  );
});
