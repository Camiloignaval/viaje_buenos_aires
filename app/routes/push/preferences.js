import { applyCors } from '../../lib/cors.js';
import { sendPlatformError } from '../../lib/platformErrors.js';
import { getPushPreferences, requirePushUser, setPushPreferences } from '../../lib/platformPush.js';

function body(req) { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}; }

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  const user = await requirePushUser(req, res);
  if (!user) return;
  try {
    if (req.method === 'GET') return res.status(200).json({ preferences: await getPushPreferences({ userId: user.userId }) });
    if (req.method === 'PUT') return res.status(200).json({ preferences: await setPushPreferences({ userId: user.userId, preferences: body(req).preferences }) });
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) { return sendPlatformError(res, error); }
}
