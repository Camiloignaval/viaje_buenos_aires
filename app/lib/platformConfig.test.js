import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlatformConfig, readBoolean, getPublicVersionInfo } from './platformConfig.js';
import { ConfigurationError } from './platformErrors.js';

test('buildPlatformConfig centraliza variables sin exponer secretos', () => {
  const config = buildPlatformConfig({
    APP_BASE_URL: 'https://alaia.cl',
    APP_VERSION: '5.0.0',
    RESEND_API_KEY: 'secret',
    EMAIL_FROM: 'Alaia <noreply@alaia.cl>',
    ENABLE_FEEDBACK: 'true',
  });

  assert.equal(config.app.baseUrl, 'https://alaia.cl');
  assert.equal(config.app.version, '5.0.0');
  assert.equal(config.email.resendApiKey, 'secret');
  assert.equal(config.flags.enableFeedback, true);
});

test('readBoolean rechaza flags inválidas', () => {
  assert.throws(() => readBoolean({ ENABLE_FEEDBACK: 'quizas' }, 'ENABLE_FEEDBACK'), ConfigurationError);
});

test('getPublicVersionInfo solo devuelve metadatos seguros', () => {
  assert.deepEqual(
    getPublicVersionInfo({ APP_VERSION: '5.0.0', VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_SHA: 'abc' }),
    { appVersion: '5.0.0', environment: 'preview', commitSha: 'abc' }
  );
});

test('ENABLE_WEATHER_PROVIDER queda apagado por defecto y solo acepta booleanos explicitos', () => {
  assert.equal(buildPlatformConfig({ NODE_ENV: 'development' }).flags.enableWeatherProvider, false);
  assert.equal(buildPlatformConfig({ NODE_ENV: 'development', ENABLE_WEATHER_PROVIDER: 'true' }).flags.enableWeatherProvider, true);
  assert.equal(buildPlatformConfig({ NODE_ENV: 'test', ENABLE_WEATHER_PROVIDER: 'false' }).flags.enableWeatherProvider, false);
  assert.throws(
    () => buildPlatformConfig({ NODE_ENV: 'production', ENABLE_WEATHER_PROVIDER: 'approved' }),
    ConfigurationError,
  );
});
