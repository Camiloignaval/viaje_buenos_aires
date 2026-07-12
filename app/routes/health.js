import { applyCors } from '../lib/cors.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  return res.status(200).json({
    status: 'ok',
    service: 'alaia',
    checkedAt: new Date().toISOString(),
  });
}
