import crypto from 'node:crypto';

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

function getCodeSecret(secret = process.env.AURORA_AUTH_CODE_SECRET ?? process.env.AURORA_JWT_SECRET) {
  if (!secret) {
    throw new Error('Aurora Platform necesita AURORA_AUTH_CODE_SECRET o AURORA_JWT_SECRET configurado.');
  }
  return secret;
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
  // MVP: el transporte real de email se conecta después sin tocar los endpoints.
  // En desarrollo queda visible en logs; en producción se exige configurar un
  // proveedor antes de usar auth real con usuarios.
  if (process.env.AURORA_AUTH_CODE_DELIVERY === 'console' || process.env.NODE_ENV !== 'production') {
    console.info(`[aurora-auth] Código de acceso para ${email}: ${code}`);
    return { delivery: 'console' };
  }
  throw new Error('Falta configurar proveedor de email para enviar códigos de acceso.');
}
