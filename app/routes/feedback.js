import { applyCors } from '../lib/cors.js';
import { requireUser } from '../lib/platformAuth.js';
import { getUsersCollection, toObjectId } from '../lib/platformMongo.js';
import { sendPlatformError } from '../lib/platformErrors.js';
import { FEATURE_FLAGS, isFeatureEnabled } from '../lib/platformFlags.js';
import { createFeedback, notificationFeedbackPayload, publicFeedback } from '../lib/platformFeedback.js';
import { notifyNewFeedback } from '../lib/notifications/notificationService.js';

function readBody(req) {
  return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!isFeatureEnabled(FEATURE_FLAGS.FEEDBACK)) {
    return res.status(403).json({ error: 'El feedback no está habilitado por ahora.' });
  }

  try {
    const session = await requireUser(req);
    const users = await getUsersCollection();
    const user = await users.findOne({ _id: toObjectId(session.userId, 'userId') });
    if (!user) {
      return res.status(401).json({ error: 'Inicia sesión para enviarnos tu mensaje.' });
    }

    const result = await createFeedback({ user, input: readBody(req) });
    const notificationResult = await notifyNewFeedback({
      feedback: notificationFeedbackPayload(result.feedback),
      user: {
        id: String(user._id),
        email: user.email,
        displayName: user.displayName,
        residenceCountryCode: user.residenceCountryCode,
      },
    }).catch((error) => {
      console.error('[feedback] No se pudo notificar feedback.', {
        feedbackId: String(result.feedback._id),
        error: error.message ?? 'unknown',
      });
      return { success: false };
    });

    return res.status(result.duplicate ? 200 : 201).json({
      feedback: publicFeedback(result.feedback),
      duplicate: result.duplicate,
      notifications: { success: Boolean(notificationResult.success) },
      message: 'Gracias por ayudarnos a mejorar Alaia. Leeremos tu mensaje con atención.',
    });
  } catch (error) {
    if (error?.statusCode === 401) {
      return res.status(401).json({ error: 'Inicia sesión para enviarnos tu mensaje.' });
    }
    return sendPlatformError(res, error);
  }
}
