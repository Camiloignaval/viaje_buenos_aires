import { applyCors } from '../../lib/cors.js';
import { getSessionToken, verifySessionToken } from '../../lib/platformAuth.js';
import { getUsersCollection, toObjectId } from '../../lib/platformMongo.js';
import { publicUser } from '../../lib/platformUsers.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const token = getSessionToken(req);
    if (!token) {
      return res.status(200).json({ user: null });
    }

    const session = verifySessionToken(token);
    const users = await getUsersCollection();
    const user = await users.findOne({ _id: toObjectId(session.userId, 'userId') });

    return res.status(200).json({ user: user ? publicUser(user) : null });
  } catch {
    return res.status(200).json({ user: null });
  }
}
