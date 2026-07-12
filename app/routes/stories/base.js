import { applyCors } from '../../lib/cors.js';
import { requireUser } from '../../lib/platformAuth.js';
import { listBaseStories } from '../../lib/platformStories.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    return res.status(200).json({ stories: await listBaseStories() });
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo cargar la historia base.', detail: error.message });
  }
}
