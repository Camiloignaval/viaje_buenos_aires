import { applyCors } from '../../lib/cors.js';
import { requireUser } from '../../lib/platformAuth.js';
import { getUsersCollection, toObjectId } from '../../lib/platformMongo.js';
import { sendPlatformError } from '../../lib/platformErrors.js';
import { normalizeOnboardingInput, publicUser } from '../../lib/platformUsers.js';

function readBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const session = await requireUser(req, res);
  if (!session) return;

  try {
    const input = normalizeOnboardingInput(readBody(req));
    const now = new Date().toISOString();
    const users = await getUsersCollection();
    const userId = toObjectId(session.userId, 'userId');

    await users.updateOne(
      { _id: userId },
      { $set: { ...input, onboardingCompleted: true, updatedAt: now } }
    );

    const user = await users.findOne({ _id: userId });
    return res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    return sendPlatformError(res, error);
  }
}
