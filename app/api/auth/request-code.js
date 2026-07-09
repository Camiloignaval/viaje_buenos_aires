import { applyCors } from '../../lib/cors.js';
import { getAuthCodesCollection } from '../../lib/platformMongo.js';
import { sendPlatformError } from '../../lib/platformErrors.js';
import { authCodeExpiresAt, deliverAuthCode, generateAuthCode, hashAuthCode, normalizeEmail } from '../../lib/platformAuthCodes.js';

function readBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { email: rawEmail } = readBody(req);
    const email = normalizeEmail(rawEmail);
    const code = generateAuthCode();
    const now = new Date().toISOString();

    const authCodes = await getAuthCodesCollection();
    await authCodes.updateOne(
      { email },
      {
        $set: {
          email,
          codeHash: hashAuthCode(email, code),
          expiresAt: authCodeExpiresAt(),
          consumedAt: null,
          attempts: 0,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    await deliverAuthCode(email, code);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
