import crypto from 'node:crypto';
import webpush from 'web-push';
import { requireUser } from './platformAuth.js';
import { getPlatformConfig, requireConfigValue } from './platformConfig.js';
import { ConfigurationError, RateLimitError, ValidationError } from './platformErrors.js';
import { getPushEventsCollection, getPushSubscriptionsCollection, getUsersCollection, toObjectId } from './platformMongo.js';

const TEST_LIMIT = 3;
const TEST_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_ENDPOINT_LENGTH = 2048;
const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

export const DEFAULT_PUSH_PREFERENCES = Object.freeze({
  enabled: false,
  beforeTrip: true,
  duringTrip: true,
  afterTrip: true,
  futureMemories: false,
});

export const TEST_PUSH_PAYLOAD = Object.freeze({
  title: 'Alaia está contigo',
  body: 'Cuando haya algo que merezca quedarse, sabremos cómo encontrarte.',
  path: '/trips',
});

function endpointHash(endpoint) {
  return crypto.createHash('sha256').update(endpoint).digest('hex');
}

function nowIso(now = new Date()) {
  return now.toISOString();
}

export function parsePushSubscription(value) {
  if (!value || typeof value !== 'object') throw new ValidationError('La suscripción no es válida.');
  const endpoint = String(value.endpoint ?? '');
  const keys = value.keys;
  if (endpoint.length > MAX_ENDPOINT_LENGTH || !/^https:\/\//i.test(endpoint)) {
    throw new ValidationError('La suscripción no es válida.');
  }
  if (!keys || typeof keys !== 'object' || !BASE64URL.test(String(keys.p256dh ?? '')) || !BASE64URL.test(String(keys.auth ?? ''))) {
    throw new ValidationError('La suscripción no es válida.');
  }
  return { endpoint, keys: { p256dh: String(keys.p256dh), auth: String(keys.auth) } };
}

export function getPushPublicKey(config = getPlatformConfig()) {
  return requireConfigValue(config.push.vapidPublicKey, 'VAPID_PUBLIC_KEY');
}

function configureWebPush(config = getPlatformConfig()) {
  const publicKey = getPushPublicKey(config);
  const privateKey = requireConfigValue(config.push.vapidPrivateKey, 'VAPID_PRIVATE_KEY');
  const subject = requireConfigValue(config.push.vapidSubject, 'VAPID_SUBJECT');
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

let indexesEnsured = false;
export async function ensurePushIndexes(subscriptions) {
  if (indexesEnsured || typeof subscriptions.createIndex !== 'function') return;
  await subscriptions.createIndex({ endpointHash: 1 }, { unique: true });
  await subscriptions.createIndex({ userId: 1, revokedAt: 1 });
  indexesEnsured = true;
}

export async function savePushSubscription({ userId, subscription, capabilities = {}, collections = {}, now = new Date() }) {
  const parsed = parsePushSubscription(subscription);
  const subscriptions = collections.subscriptions ?? (await getPushSubscriptionsCollection());
  await ensurePushIndexes(subscriptions);
  const timestamp = nowIso(now);
  await subscriptions.updateOne(
    { endpointHash: endpointHash(parsed.endpoint) },
    {
      $set: {
        userId: toObjectId(userId, 'userId'),
        endpoint: parsed.endpoint,
        endpointHash: endpointHash(parsed.endpoint),
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        capabilities: {
          pushManager: capabilities.pushManager === true,
          notifications: capabilities.notifications === true,
          standalone: capabilities.standalone === true,
        },
        updatedAt: timestamp,
        revokedAt: null,
        failureCount: 0,
      },
      $setOnInsert: { createdAt: timestamp, lastSuccessfulPushAt: null },
    },
    { upsert: true },
  );
  return { active: true };
}

export async function revokePushSubscription({ userId, subscription, collections = {}, now = new Date() }) {
  const parsed = parsePushSubscription(subscription);
  const subscriptions = collections.subscriptions ?? (await getPushSubscriptionsCollection());
  const result = await subscriptions.updateOne(
    { userId: toObjectId(userId, 'userId'), endpointHash: endpointHash(parsed.endpoint), revokedAt: null },
    { $set: { revokedAt: nowIso(now), updatedAt: nowIso(now) } },
  );
  return { active: false, removed: result.modifiedCount === 1 };
}

export function normalizePushPreferences(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    enabled: input.enabled === true,
    beforeTrip: input.beforeTrip !== false,
    duringTrip: input.duringTrip !== false,
    afterTrip: input.afterTrip !== false,
    futureMemories: input.futureMemories === true,
  };
}

export async function getPushPreferences({ userId, collections = {} }) {
  const users = collections.users ?? (await getUsersCollection());
  const user = await users.findOne({ _id: toObjectId(userId, 'userId') }, { projection: { pushPreferences: 1 } });
  return normalizePushPreferences(user?.pushPreferences ?? DEFAULT_PUSH_PREFERENCES);
}

export async function setPushPreferences({ userId, preferences, collections = {}, now = new Date() }) {
  const users = collections.users ?? (await getUsersCollection());
  const next = normalizePushPreferences(preferences);
  await users.updateOne(
    { _id: toObjectId(userId, 'userId') },
    { $set: { pushPreferences: next, pushPreferencesUpdatedAt: nowIso(now) } },
  );
  return next;
}

async function registerFailure(subscriptions, subscription, error, now) {
  const statusCode = Number(error?.statusCode ?? error?.statusCode);
  const set = { updatedAt: nowIso(now) };
  if (statusCode === 404 || statusCode === 410) set.revokedAt = nowIso(now);
  await subscriptions.updateOne(
    { _id: subscription._id },
    { $inc: { failureCount: 1 }, $set: set },
  );
}

export async function sendPushToUser({ userId, payload, collections = {}, now = new Date(), send = webpush.sendNotification }) {
  configureWebPush();
  const subscriptions = collections.subscriptions ?? (await getPushSubscriptionsCollection());
  const active = await subscriptions.find({ userId: toObjectId(userId, 'userId'), revokedAt: null }).toArray();
  const results = await Promise.all(active.map(async (subscription) => {
    try {
      await send({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload), { TTL: 60 });
      await subscriptions.updateOne({ _id: subscription._id }, { $set: { lastSuccessfulPushAt: nowIso(now), updatedAt: nowIso(now), failureCount: 0 } });
      return { ok: true };
    } catch (error) {
      await registerFailure(subscriptions, subscription, error, now);
      return { ok: false };
    }
  }));
  return { attempted: active.length, delivered: results.filter((result) => result.ok).length };
}

export async function sendTestPush({ user, collections = {}, now = new Date(), send } = {}) {
  if (!user?.userId) throw new ValidationError('Inicia sesión para continuar.');
  const subscriptions = collections.subscriptions ?? (await getPushSubscriptionsCollection());
  const events = collections.events ?? (await getPushEventsCollection());
  const since = new Date(now.getTime() - TEST_WINDOW_MS).toISOString();
  const sent = await events.countDocuments({ userId: toObjectId(user.userId, 'userId'), type: 'test', createdAt: { $gte: since } });
  if (sent >= TEST_LIMIT) throw new RateLimitError('Ya enviaste suficientes pruebas hoy.');
  const result = await sendPushToUser({ userId: user.userId, payload: TEST_PUSH_PAYLOAD, collections, now, send });
  if (result.attempted) await events.insertOne({ userId: toObjectId(user.userId, 'userId'), type: 'test', createdAt: nowIso(now), attempted: result.attempted, delivered: result.delivered });
  return result;
}

export async function requirePushUser(req, res) {
  return requireUser(req, res);
}
