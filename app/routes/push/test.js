import { applyCors } from '../../lib/cors.js';
import { sendPlatformError } from '../../lib/platformErrors.js';
import { requirePushUser, sendTestPush } from '../../lib/platformPush.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).json({ error: 'Método no permitido' }); }
  const user = await requirePushUser(req, res);
  if (!user) return;
  try { return res.status(200).json(await sendTestPush({ user })); }
  catch (error) { return sendPlatformError(res, error); }
}
