import crypto from 'node:crypto';
import { sendVerifyEmail } from './email/senders/sendVerifyEmail.js';
import { getPlatformConfig, requireConfigValue } from './platformConfig.js';

export const AUTH_CODE_TTL_SECONDS = 60 * 10;
export const AUTH_CODE_LENGTH = 6;

export function normalizeEmail(email) {
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Email inválido.');
  }
  return normalized;
}

export function generateAuthCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(AUTH_CODE_LENGTH, '0');
}

function getCodeSecret(secret = getPlatformConfig().auth.authCodeSecret || getPlatformConfig().auth.jwtSecret) {
  return requireConfigValue(secret, 'ALAIA_AUTH_CODE_SECRET o ALAIA_JWT_SECRET');
}

export function hashAuthCode(email, code, { secret } = {}) {
  const normalizedEmail = normalizeEmail(email);
  return crypto
    .createHmac('sha256', getCodeSecret(secret))
    .update(`${normalizedEmail}:${code}`)
    .digest('hex');
}

export function verifyAuthCodeHash(email, code, expectedHash, { secret } = {}) {
  if (!expectedHash || typeof expectedHash !== 'string') {
    return false;
  }
  const received = Buffer.from(hashAuthCode(email, code, { secret }));
  const expected = Buffer.from(expectedHash);
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export function authCodeExpiresAt({ now = Date.now(), ttlSeconds = AUTH_CODE_TTL_SECONDS } = {}) {
  return new Date(now + ttlSeconds * 1000).toISOString();
}

export async function deliverAuthCode(email, code) {
  // MVP: si hay RESEND_API_KEY configurada, el código sale por mail real con
  // el template VerifyEmail de Alaia (free tier de Resend: 3000/mes). Sin
  // esa key, en desarrollo queda visible en logs; en producción se exige
  // configurar un proveedor antes de usar auth real con usuarios.
  if (getPlatformConfig().email.resendApiKey) {
    const result = await sendVerifyEmail({ email, code });
    if (!result.success) {
      throw new Error(`Resend rechazó el envío: ${result.error}`);
    }
    return { delivery: 'resend' };
  }
  if (process.env.ALAIA_AUTH_CODE_DELIVERY === 'console' || process.env.NODE_ENV !== 'production') {
    console.info(`[alaia-auth] Código de acceso para ${email}: ${code}`);
    return { delivery: 'console' };
  }
  throw new Error('Falta configurar proveedor de email para enviar códigos de acceso.');
}
