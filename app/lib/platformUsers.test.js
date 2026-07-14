import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOnboardingInput, isOnboardingComplete, publicUser } from './platformUsers.js';

test('normalizeOnboardingInput recorta el nombre y normaliza el código de país', () => {
  assert.deepEqual(
    normalizeOnboardingInput({ displayName: '  Kari  ', residenceCountryCode: 'cl' }),
    { displayName: 'Kari', residenceCountryCode: 'CL' }
  );
});

test('normalizeOnboardingInput exige displayName', () => {
  assert.throws(() => normalizeOnboardingInput({ residenceCountryCode: 'CL' }), /cómo te llamamos/);
});

test('normalizeOnboardingInput rechaza código de país inválido', () => {
  assert.throws(() => normalizeOnboardingInput({ displayName: 'Kari', residenceCountryCode: 'Chile' }), /país de residencia/);
});

test('isOnboardingComplete exige la bandera Y los campos (usuarios legacy quedan pendientes)', () => {
  assert.equal(isOnboardingComplete({ onboardingCompleted: true, displayName: 'Kari', residenceCountryCode: 'CL' }), true);
  assert.equal(isOnboardingComplete({ onboardingCompleted: true }), false);
  assert.equal(isOnboardingComplete({ displayName: 'Kari', residenceCountryCode: 'CL' }), false);
  assert.equal(isOnboardingComplete(undefined), false);
});

test('publicUser expone el shape público con onboarding derivado', () => {
  const user = {
    _id: 'abc123',
    email: 'kari@ejemplo.com',
    displayName: 'Kari',
    residenceCountryCode: 'CL',
    onboardingCompleted: true,
  };
  assert.deepEqual(publicUser(user), {
    id: 'abc123',
    email: 'kari@ejemplo.com',
    displayName: 'Kari',
    residenceCountryCode: 'CL',
    preferredCurrency: null,
    emailVerifiedAt: null,
    onboardingCompleted: true,
  });
});

test('publicUser expone preferredCurrency cuando el documento ya lo tiene', () => {
  const user = {
    _id: 'abc123',
    email: 'kari@ejemplo.com',
    displayName: 'Kari',
    residenceCountryCode: 'CL',
    preferredCurrency: 'CLP',
    onboardingCompleted: true,
  };
  assert.equal(publicUser(user).preferredCurrency, 'CLP');
});

test('publicUser devuelve onboarding pendiente y nulls para usuario legacy sin esos campos', () => {
  const legacyUser = { _id: 'legacy1', email: 'viejo@ejemplo.com' };
  assert.deepEqual(publicUser(legacyUser), {
    id: 'legacy1',
    email: 'viejo@ejemplo.com',
    displayName: null,
    residenceCountryCode: null,
    preferredCurrency: null,
    emailVerifiedAt: null,
    onboardingCompleted: false,
  });
});
