import assert from 'node:assert/strict';
import test from 'node:test';
import { isPlatformConfigurationError, platformErrorStatus } from './platformErrors.js';

test('platformErrorStatus clasifica errores de configuración como 503', () => {
  assert.equal(platformErrorStatus(new Error('Aurora Platform necesita MONGODB_URI configurado.')), 503);
  assert.equal(platformErrorStatus(new Error('Aurora no tiene Cloudinary configurado.')), 503);
  assert.equal(platformErrorStatus(new Error('Falta configurar proveedor de email para enviar códigos de acceso.')), 503);
});

test('platformErrorStatus mantiene errores de input como 400', () => {
  assert.equal(isPlatformConfigurationError(new Error('Email inválido.')), false);
  assert.equal(platformErrorStatus(new Error('Email inválido.')), 400);
});
