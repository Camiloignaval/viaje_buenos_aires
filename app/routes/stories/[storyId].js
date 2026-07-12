import { applyCors } from '../../lib/cors.js';
import { requireUser } from '../../lib/platformAuth.js';
import { getBaseStory } from '../../lib/platformStories.js';

function storyIdFrom(req) {
  return req.query?.storyId ?? req.query?.id;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const story = await getBaseStory(storyIdFrom(req));
    if (!story) {
      return res.status(404).json({ error: 'Story base no encontrada.' });
    }
    return res.status(200).json({ story });
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo cargar la historia base.', detail: error.message });
  }
}
