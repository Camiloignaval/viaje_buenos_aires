import { applyCors } from '../../lib/cors.js';
import { getPushPublicKey } from '../../lib/platformPush.js';
import { sendPlatformError } from '../../lib/platformErrors.js';

export default function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }
  try {
    return res.status(200).json({ publicKey: getPushPublicKey() });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
