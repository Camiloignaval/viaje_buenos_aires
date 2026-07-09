export function isPlatformConfigurationError(error) {
  const message = String(error?.message ?? '');
  return (
    message.includes('AURORA_MONGODB_URI') ||
    message.includes('AURORA_JWT_SECRET') ||
    message.includes('AURORA_AUTH_CODE_SECRET') ||
    message.includes('Cloudinary configurado') ||
    message.includes('proveedor de email') ||
    message.includes('CLOUDINARY_')
  );
}

export function platformErrorStatus(error, fallbackStatus = 400) {
  return isPlatformConfigurationError(error) ? 503 : fallbackStatus;
}

export function sendPlatformError(res, error, { fallbackStatus = 400, fallbackMessage } = {}) {
  const status = platformErrorStatus(error, fallbackStatus);
  return res.status(status).json({ error: fallbackMessage ?? error.message });
}
