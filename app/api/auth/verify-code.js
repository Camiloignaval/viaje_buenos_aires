import { applyCors } from '../../lib/cors.js';
import { createSessionToken, setSessionCookie, verifySessionToken } from '../../lib/platformAuth.js';
import { getAuthCodesCollection, getUsersCollection } from '../../lib/platformMongo.js';
import { sendPlatformError } from '../../lib/platformErrors.js';
import { normalizeEmail, verifyAuthCodeHash } from '../../lib/platformAuthCodes.js';

function readBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
}

function publicUser(user) {
  return { id: String(user._id), email: user.email, name: user.name ?? null };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { email: rawEmail, code } = readBody(req);
    const email = normalizeEmail(rawEmail);
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código inválido.' });
    }

    const authCodes = await getAuthCodesCollection();
    const authCode = await authCodes.findOne({ email, consumedAt: null });
    if (!authCode || authCode.expiresAt <= new Date().toISOString()) {
      return res.status(401).json({ error: 'Código expirado o inválido.' });
    }
    if (!verifyAuthCodeHash(email, code, authCode.codeHash)) {
      await authCodes.updateOne({ _id: authCode._id }, { $inc: { attempts: 1 }, $set: { updatedAt: new Date().toISOString() } });
      return res.status(401).json({ error: 'Código expirado o inválido.' });
    }

    const now = new Date().toISOString();
    const users = await getUsersCollection();
    await users.updateOne(
      { email },
      {
        $setOnInsert: { email, name: null, avatarUrl: null, createdAt: now },
        $set: { updatedAt: now, lastLoginAt: now },
      },
      { upsert: true }
    );
    const user = await users.findOne({ email });

    await authCodes.updateOne({ _id: authCode._id }, { $set: { consumedAt: now, updatedAt: now } });

    const token = createSessionToken({ id: String(user._id), email: user.email });
    const session = verifySessionToken(token);
    setSessionCookie(res, token);
    return res.status(200).json({ user: publicUser(user), expiresAt: session.expiresAt });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
