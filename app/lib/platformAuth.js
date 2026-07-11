import crypto from 'node:crypto';
import { getTripsCollection, toObjectId } from './platformMongo.js';
import { getPlatformConfig, requireConfigValue } from './platformConfig.js';

export const SESSION_COOKIE_NAME = 'alaia_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export class AuthError extends Error {
  constructor(message = 'No autenticado.', statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function decodeBase64url(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function getJwtSecret(secret = getPlatformConfig().auth.jwtSecret) {
  return requireConfigValue(secret, 'ALAIA_JWT_SECRET');
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function constantTimeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function createSessionToken(user, { secret, now = Date.now(), ttlSeconds = SESSION_TTL_SECONDS } = {}) {
  if (!user?.id || !user?.email) {
    throw new Error('createSessionToken requiere user.id y user.email.');
  }

  const issuedAt = Math.floor(now / 1000);
  const payload = {
    sub: String(user.id),
    email: String(user.email).toLowerCase(),
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };
  const header = { alg: 'HS256', typ: 'JWT' };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  return `${unsigned}.${sign(unsigned, getJwtSecret(secret))}`;
}

export function verifySessionToken(token, { secret, now = Date.now() } = {}) {
  if (!token || typeof token !== 'string') {
    throw new AuthError();
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AuthError('Sesión inválida.');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const expected = sign(unsigned, getJwtSecret(secret));
  if (!constantTimeEqual(signature, expected)) {
    throw new AuthError('Sesión inválida.');
  }

  const header = JSON.parse(decodeBase64url(encodedHeader));
  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new AuthError('Sesión inválida.');
  }

  const payload = JSON.parse(decodeBase64url(encodedPayload));
  if (!payload.sub || !payload.email || !payload.exp) {
    throw new AuthError('Sesión inválida.');
  }
  if (payload.exp <= Math.floor(now / 1000)) {
    throw new AuthError('Sesión expirada.');
  }

  return { userId: payload.sub, email: payload.email, expiresAt: new Date(payload.exp * 1000).toISOString() };
}

export function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    String(cookieHeader)
      .split(';')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const index = pair.indexOf('=');
        if (index === -1) {
          return [decodeURIComponent(pair), ''];
        }
        return [decodeURIComponent(pair.slice(0, index)), decodeURIComponent(pair.slice(index + 1))];
      })
  );
}

export function serializeCookie(name, value, { maxAge, httpOnly = true, secure = process.env.NODE_ENV === 'production', sameSite = 'Lax', path = '/' } = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  if (Number.isFinite(maxAge)) parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  return parts.join('; ');
}

function appendSetCookie(res, cookie) {
  const previous = res.getHeader?.('Set-Cookie');
  const next = previous ? (Array.isArray(previous) ? [...previous, cookie] : [previous, cookie]) : cookie;
  res.setHeader('Set-Cookie', next);
}

export function setSessionCookie(res, token, { maxAge = SESSION_TTL_SECONDS } = {}) {
  appendSetCookie(res, serializeCookie(SESSION_COOKIE_NAME, token, { maxAge }));
}

export function clearSessionCookie(res) {
  appendSetCookie(res, serializeCookie(SESSION_COOKIE_NAME, '', { maxAge: 0 }));
}

export function getSessionToken(req) {
  return req.cookies?.[SESSION_COOKIE_NAME] ?? parseCookies(req.headers?.cookie)[SESSION_COOKIE_NAME] ?? null;
}

export function sendAuthError(res, error = new AuthError()) {
  const statusCode = error.statusCode ?? 401;
  return res.status(statusCode).json({ error: error.message });
}

export async function requireUser(req, res, options = {}) {
  try {
    return verifySessionToken(getSessionToken(req), options);
  } catch (error) {
    if (res) {
      sendAuthError(res, error);
      return null;
    }
    throw error;
  }
}

export async function requireTripMember(req, res, tripId, options = {}) {
  const user = await requireUser(req, res, options);
  if (!user) {
    return null;
  }

  const trips = await getTripsCollection();
  const userObjectId = toObjectId(user.userId, 'userId');
  const trip = await trips.findOne({
    _id: toObjectId(tripId, 'tripId'),
    'members.userId': userObjectId,
  });

  if (!trip) {
    const error = new AuthError('No tenés acceso a este viaje.', 403);
    if (res) {
      sendAuthError(res, error);
      return null;
    }
    throw error;
  }

  const member = trip.members?.find((item) => String(item.userId) === String(userObjectId));
  return { user, trip, role: member?.role ?? null };
}

export async function requireTripRole(req, res, tripId, allowedRoles, options = {}) {
  const context = await requireTripMember(req, res, tripId, options);
  if (!context) {
    return null;
  }

  if (!allowedRoles.includes(context.role)) {
    const error = new AuthError('No tenés permisos para esta acción.', 403);
    if (res) {
      sendAuthError(res, error);
      return null;
    }
    throw error;
  }

  return context;
}
