import { applyCors } from '../../../lib/cors.js';
import { requireUser } from '../../../lib/platformAuth.js';
import { getUsersCollection, toObjectId } from '../../../lib/platformMongo.js';
import { sendPlatformError } from '../../../lib/platformErrors.js';
import { acceptInvitation } from '../../../lib/platformInvitations.js';

// POST /api/invitations/:token/accept → acepta con sesión; alta atómica de member.
// El frontend navega luego a /trips/:tripId (Portada), no directo a Experience.
export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const session = await requireUser(req, res);
  if (!session) return;

  try {
    const users = await getUsersCollection();
    const user = await users.findOne({ _id: toObjectId(session.userId, 'userId') });
    if (!user) return res.status(401).json({ error: 'Inicia sesión para continuar.' });

    const result = await acceptInvitation({ token: req.query?.token, user });
    return res.status(200).json(result);
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
