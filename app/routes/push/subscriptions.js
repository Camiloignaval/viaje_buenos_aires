import { applyCors } from '../../lib/cors.js';
import { sendPlatformError } from '../../lib/platformErrors.js';
import { requirePushUser, revokePushSubscription, savePushSubscription } from '../../lib/platformPush.js';

function body(req) { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}; }

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  const user = await requirePushUser(req, res);
  if (!user) return;
  try {
    const payload = body(req);
    if (req.method === 'POST') return res.status(200).json(await savePushSubscription({ userId: user.userId, subscription: payload.subscription, capabilities: payload.capabilities }));
    if (req.method === 'DELETE') return res.status(200).json(await revokePushSubscription({ userId: user.userId, subscription: payload.subscription }));
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) { return sendPlatformError(res, error); }
}
