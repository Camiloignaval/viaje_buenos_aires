import crypto from 'node:crypto';
import { EmailNotVerifiedError, IncompleteProfileError, RateLimitError, ValidationError } from './platformErrors.js';
import { getFeedbackCollection, getTripsCollection, toObjectId } from './platformMongo.js';
import { isOnboardingComplete } from './platformUsers.js';

export const FEEDBACK_CATEGORIES = Object.freeze({
  suggestion: 'sugerencia',
  problem: 'problema',
  question: 'consulta',
  other: 'otro',
});

export const FEEDBACK_STATUSES = Object.freeze({
  new: 'new',
  reviewed: 'reviewed',
  resolved: 'resolved',
  discarded: 'discarded',
});

const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 3000;
const CONTEXT_MAX_LENGTH = 300;
const URL_MAX_LENGTH = 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const DOUBLE_SUBMIT_WINDOW_MS = 60 * 1000;

function cleanText(value, maxLength = CONTEXT_MAX_LENGTH) {
  if (value == null) return null;
  const text = String(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function cleanUrl(value) {
  const text = cleanText(value, URL_MAX_LENGTH);
  if (!text) return null;
  if (!/^https?:\/\//i.test(text) && !text.startsWith('/')) return null;
  return text;
}

export function normalizeFeedbackInput(input = {}) {
  const category = FEEDBACK_CATEGORIES[String(input.category ?? '').trim()];
  if (!category) {
    throw new ValidationError('Elige una categoría válida.');
  }

  const message = cleanText(input.message, MESSAGE_MAX_LENGTH);
  if (!message || message.length < MESSAGE_MIN_LENGTH) {
    throw new ValidationError('Cuéntanos un poco más para poder entender tu sugerencia.');
  }

  return {
    category,
    message,
    tripId: cleanText(input.tripId, 80),
    page: cleanText(input.page),
    pageUrl: cleanUrl(input.pageUrl),
    locale: cleanText(input.locale, 40),
    timezone: cleanText(input.timezone, 80),
    appVersion: cleanText(input.appVersion, 80),
    browser: cleanText(input.browser),
    os: cleanText(input.os),
    deviceType: cleanText(input.deviceType, 80),
  };
}

export function assertUserCanSendFeedback(user) {
  if (!user?.emailVerifiedAt) {
    throw new EmailNotVerifiedError();
  }
  if (!isOnboardingComplete(user)) {
    throw new IncompleteProfileError();
  }
}

function fingerprintFeedback({ userId, input }) {
  return crypto
    .createHash('sha256')
    .update([userId, input.tripId ?? '', input.category, input.message].join('|'))
    .digest('hex');
}

export async function validateFeedbackTripOwnership({ tripId, userId, trips = null }) {
  if (!tripId) return null;
  const tripObjectId = toObjectId(tripId, 'tripId');
  const userObjectId = toObjectId(userId, 'userId');
  const tripsCollection = trips ?? (await getTripsCollection());
  const trip = await tripsCollection.findOne({ _id: tripObjectId, 'members.userId': userObjectId });
  if (!trip) {
    throw new ValidationError('El viaje indicado no pertenece a tu cuenta.');
  }
  return tripObjectId;
}

export async function enforceFeedbackRateLimit({ feedback, userId, now = new Date() }) {
  const since = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS).toISOString();
  const count = await feedback.countDocuments({ userId: toObjectId(userId, 'userId'), createdAt: { $gte: since } });
  if (count >= RATE_LIMIT_MAX) {
    throw new RateLimitError('Gracias por escribirnos. Espera un poco antes de enviar otra sugerencia.');
  }
}

export async function createFeedback({ user, input, collections = {}, now = new Date().toISOString() }) {
  assertUserCanSendFeedback(user);
  const normalized = normalizeFeedbackInput(input);

  const feedback = collections.feedback ?? (await getFeedbackCollection());
  const trips = collections.trips ?? null;
  await enforceFeedbackRateLimit({ feedback, userId: user._id, now: new Date(now) });
  const tripObjectId = await validateFeedbackTripOwnership({ tripId: normalized.tripId, userId: user._id, trips });
  const fingerprint = fingerprintFeedback({ userId: user._id, input: normalized });
  const duplicateSince = new Date(new Date(now).getTime() - DOUBLE_SUBMIT_WINDOW_MS).toISOString();

  const existing = await feedback.findOne({
    userId: toObjectId(user._id, 'userId'),
    fingerprint,
    createdAt: { $gte: duplicateSince },
  });
  if (existing) {
    return { feedback: existing, duplicate: true };
  }

  const userObjectId = toObjectId(user._id, 'userId');
  const doc = {
    userId: userObjectId,
    tripId: tripObjectId,
    category: normalized.category,
    message: normalized.message,
    page: normalized.page,
    pageUrl: normalized.pageUrl,
    locale: normalized.locale,
    timezone: normalized.timezone,
    appVersion: normalized.appVersion,
    browser: normalized.browser,
    os: normalized.os,
    deviceType: normalized.deviceType,
    attachmentUrl: null,
    status: FEEDBACK_STATUSES.new,
    fingerprint,
    createdAt: now,
    updatedAt: now,
  };

  const result = await feedback.insertOne(doc);
  return { feedback: { ...doc, _id: result.insertedId }, duplicate: false };
}

export function publicFeedback(feedback) {
  return {
    id: String(feedback._id),
    status: feedback.status,
    createdAt: feedback.createdAt,
  };
}

export function notificationFeedbackPayload(feedback) {
  return {
    id: String(feedback._id),
    userId: String(feedback.userId),
    tripId: feedback.tripId ? String(feedback.tripId) : null,
    category: feedback.category,
    message: feedback.message,
    page: feedback.page,
    pageUrl: feedback.pageUrl,
    locale: feedback.locale,
    timezone: feedback.timezone,
    appVersion: feedback.appVersion,
    browser: feedback.browser,
    os: feedback.os,
    deviceType: feedback.deviceType,
    createdAt: feedback.createdAt,
  };
}
