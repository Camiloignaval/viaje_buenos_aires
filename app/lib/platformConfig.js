import { ConfigurationError } from './platformErrors.js';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

function readString(env, name, { required = false, defaultValue = '' } = {}) {
  const value = env[name];
  if (value == null || String(value).trim() === '') {
    if (required) throw new ConfigurationError(`Falta configurar ${name}.`, { variable: name });
    return defaultValue;
  }
  return String(value).trim();
}

export function readBoolean(env, name, defaultValue = false) {
  const raw = env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const normalized = String(raw).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  throw new ConfigurationError(`${name} debe ser booleano.`, { variable: name });
}

export function buildPlatformConfig(env = process.env) {
  return {
    app: {
      baseUrl: readString(env, 'APP_BASE_URL', { defaultValue: '' }),
      version: readString(env, 'APP_VERSION', { defaultValue: env.npm_package_version ?? '0.0.0' }),
      environment: readString(env, 'VERCEL_ENV', { defaultValue: env.NODE_ENV ?? 'development' }),
      commitSha: readString(env, 'VERCEL_GIT_COMMIT_SHA', { defaultValue: '' }),
    },
    database: {
      mongodbUri: readString(env, 'MONGODB_URI', { defaultValue: '' }),
    },
    auth: {
      jwtSecret: readString(env, 'ALAIA_JWT_SECRET', { defaultValue: '' }),
      authCodeSecret: readString(env, 'ALAIA_AUTH_CODE_SECRET', { defaultValue: '' }),
    },
    push: {
      vapidPublicKey: readString(env, 'VAPID_PUBLIC_KEY', { defaultValue: '' }),
      vapidPrivateKey: readString(env, 'VAPID_PRIVATE_KEY', { defaultValue: '' }),
      vapidSubject: readString(env, 'VAPID_SUBJECT', { defaultValue: '' }),
    },
    email: {
      resendApiKey: readString(env, 'RESEND_API_KEY', { defaultValue: '' }),
      from: readString(env, 'EMAIL_FROM', { defaultValue: '' }),
      replyTo: readString(env, 'EMAIL_REPLY_TO', { defaultValue: '' }),
      adminNotificationEmail: readString(env, 'ADMIN_NOTIFICATION_EMAIL', { defaultValue: '' }),
      feedbackNotificationEmail: readString(env, 'FEEDBACK_NOTIFICATION_EMAIL', { defaultValue: '' }),
      operationsAlertEmail: readString(env, 'OPERATIONS_ALERT_EMAIL', { defaultValue: '' }),
    },
    flags: {
      enableFeedback: readBoolean(env, 'ENABLE_FEEDBACK', true),
      enableTransactionalEmails: readBoolean(env, 'ENABLE_TRANSACTIONAL_EMAILS', true),
      enableNewUserNotifications: readBoolean(env, 'ENABLE_NEW_USER_NOTIFICATIONS', false),
      enableFeedbackNotifications: readBoolean(env, 'ENABLE_FEEDBACK_NOTIFICATIONS', true),
      enableSystemAlerts: readBoolean(env, 'ENABLE_SYSTEM_ALERTS', false),
      enableTripFailureAlerts: readBoolean(env, 'ENABLE_TRIP_FAILURE_ALERTS', false),
      enableAiGeneration: readBoolean(env, 'ENABLE_AI_GENERATION', false),
      enableWeatherProvider: readBoolean(env, 'ENABLE_WEATHER_PROVIDER', false),
    },
  };
}

export function getPlatformConfig() {
  return buildPlatformConfig(process.env);
}

export function requireConfigValue(value, name) {
  if (!value) throw new ConfigurationError(`Falta configurar ${name}.`, { variable: name });
  return value;
}

export function getPublicVersionInfo(env = process.env) {
  const config = buildPlatformConfig(env);
  return {
    appVersion: config.app.version,
    environment: config.app.environment,
    commitSha: config.app.commitSha || null,
  };
}
