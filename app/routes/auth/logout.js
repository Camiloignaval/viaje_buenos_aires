import { applyCors } from '../../lib/cors.js';
import { clearSessionCookie } from '../../lib/platformAuth.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}
