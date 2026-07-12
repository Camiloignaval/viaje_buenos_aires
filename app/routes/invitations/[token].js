import { applyCors } from '../../lib/cors.js';
import { sendPlatformError } from '../../lib/platformErrors.js';
import { getInvitationPreview } from '../../lib/platformInvitations.js';

// GET /api/invitations/:token → preview público sanitizado (sin sesión).
// Nunca expone miembros, ids, emails de terceros ni tokenHash.
export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const preview = await getInvitationPreview({ token: req.query?.token });
    return res.status(200).json({ invitation: preview });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
