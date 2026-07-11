export const ERROR_CODES = Object.freeze({
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  INCOMPLETE_PROFILE: 'INCOMPLETE_PROFILE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  FORBIDDEN: 'FORBIDDEN',
  EMAIL_DELIVERY_ERROR: 'EMAIL_DELIVERY_ERROR',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
});

export class PlatformError extends Error {
  constructor({
    code = ERROR_CODES.UNEXPECTED_ERROR,
    safeMessage = 'No pudimos completar esta acción.',
    internalMessage,
    statusCode = 500,
    retryable = false,
    severity = 'error',
    details,
  } = {}) {
    super(internalMessage ?? safeMessage);
    this.name = this.constructor.name;
    this.code = code;
    this.safeMessage = safeMessage;
    this.internalMessage = internalMessage ?? safeMessage;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.severity = severity;
    this.details = details;
  }
}

export class ConfigurationError extends PlatformError {
  constructor(message, details) {
    super({
      code: ERROR_CODES.CONFIGURATION_ERROR,
      safeMessage: 'La plataforma necesita completar su configuración.',
      internalMessage: message,
      statusCode: 503,
      retryable: false,
      severity: 'critical',
      details,
    });
  }
}

export class AuthenticationRequiredError extends PlatformError {
  constructor(message = 'Inicia sesión para continuar.') {
    super({
      code: ERROR_CODES.AUTHENTICATION_REQUIRED,
      safeMessage: message,
      statusCode: 401,
      retryable: false,
      severity: 'warning',
    });
  }
}

export class EmailNotVerifiedError extends PlatformError {
  constructor(message = 'Verifica tu correo antes de enviarnos una sugerencia.') {
    super({
      code: ERROR_CODES.EMAIL_NOT_VERIFIED,
      safeMessage: message,
      statusCode: 403,
      retryable: false,
      severity: 'warning',
    });
  }
}

export class IncompleteProfileError extends PlatformError {
  constructor(message = 'Completa tu nombre y país para continuar.') {
    super({
      code: ERROR_CODES.INCOMPLETE_PROFILE,
      safeMessage: message,
      statusCode: 422,
      retryable: false,
      severity: 'warning',
    });
  }
}

export class ValidationError extends PlatformError {
  constructor(message = 'Revisá los datos enviados.', details) {
    super({
      code: ERROR_CODES.VALIDATION_ERROR,
      safeMessage: message,
      statusCode: 400,
      retryable: false,
      severity: 'warning',
      details,
    });
  }
}

export class RateLimitError extends PlatformError {
  constructor(message = 'Esperá un momento antes de volver a intentarlo.') {
    super({
      code: ERROR_CODES.RATE_LIMITED,
      safeMessage: message,
      statusCode: 429,
      retryable: true,
      severity: 'warning',
    });
  }
}

export class EmailDeliveryError extends PlatformError {
  constructor(message = 'No se pudo enviar el correo.', details) {
    super({
      code: ERROR_CODES.EMAIL_DELIVERY_ERROR,
      safeMessage: message,
      internalMessage: message,
      statusCode: 502,
      retryable: true,
      severity: 'error',
      details,
    });
  }
}

export function isPlatformConfigurationError(error) {
  if (error instanceof ConfigurationError) return true;
  const message = String(error?.message ?? '');
  return (
    message.includes('MONGODB_URI') ||
    message.includes('ALAIA_JWT_SECRET') ||
    message.includes('ALAIA_AUTH_CODE_SECRET') ||
    message.includes('Cloudinary configurado') ||
    message.includes('proveedor de email') ||
    message.includes('CLOUDINARY_') ||
    message.includes('EMAIL_FROM') ||
    message.includes('RESEND_API_KEY')
  );
}

export function platformErrorStatus(error, fallbackStatus = 400) {
  if (error instanceof PlatformError) return error.statusCode;
  return isPlatformConfigurationError(error) ? 503 : fallbackStatus;
}

export function platformErrorBody(error, fallbackMessage) {
  if (error instanceof PlatformError) {
    return {
      error: fallbackMessage ?? error.safeMessage,
      code: error.code,
    };
  }
  return { error: fallbackMessage ?? error.message };
}

export function sendPlatformError(res, error, { fallbackStatus = 400, fallbackMessage } = {}) {
  const status = platformErrorStatus(error, fallbackStatus);
  return res.status(status).json(platformErrorBody(error, fallbackMessage));
}
