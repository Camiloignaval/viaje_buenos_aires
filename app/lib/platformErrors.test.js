import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ConflictError,
  ForbiddenError,
  GoneError,
  NotFoundError,
  isPlatformConfigurationError,
  platformErrorStatus,
} from './platformErrors.js';

test('platformErrorStatus clasifica errores de configuración como 503', () => {
  assert.equal(platformErrorStatus(new Error('Alaia Platform necesita MONGODB_URI configurado.')), 503);
  assert.equal(platformErrorStatus(new Error('Alaia no tiene Cloudinary configurado.')), 503);
  assert.equal(platformErrorStatus(new Error('Falta configurar proveedor de email para enviar códigos de acceso.')), 503);
});

test('platformErrorStatus mantiene errores de input como 400', () => {
  assert.equal(isPlatformConfigurationError(new Error('Email inválido.')), false);
  assert.equal(platformErrorStatus(new Error('Email inválido.')), 400);
});

test('los errores tipados de invitaciones mapean a su status HTTP', () => {
  assert.equal(platformErrorStatus(new ForbiddenError()), 403);
  assert.equal(platformErrorStatus(new NotFoundError()), 404);
  assert.equal(platformErrorStatus(new ConflictError()), 409);
  assert.equal(platformErrorStatus(new GoneError()), 410);
});

test('los errores tipados exponen safeMessage y code, no detalles internos', () => {
  const conflict = new ConflictError('Este viaje ya está completo.');
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.code, 'CONFLICT');
  assert.equal(conflict.safeMessage, 'Este viaje ya está completo.');
});
