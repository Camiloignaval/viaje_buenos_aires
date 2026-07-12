import { applyCors } from '../../../../../lib/cors.js';
import { requireTripRole } from '../../../../../lib/platformAuth.js';
import { sendPlatformError } from '../../../../../lib/platformErrors.js';
import { revokeInvitation } from '../../../../../lib/platformInvitations.js';

// POST /api/trips/:tripId/invitations/:invitationId/revoke → revoca (owner, solo pending)
export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const tripId = req.query?.tripId;
  const invitationId = req.query?.invitationId;

  const context = await requireTripRole(req, res, tripId, ['owner']);
  if (!context) return;

  try {
    const result = await revokeInvitation({
      tripId,
      invitationId,
      owner: { _id: context.user.userId },
    });
    return res.status(200).json(result);
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
