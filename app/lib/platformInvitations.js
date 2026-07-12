import crypto from 'node:crypto';
import {
  ConflictError,
  EmailNotVerifiedError,
  ForbiddenError,
  GoneError,
  IncompleteProfileError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from './platformErrors.js';
import {
  getTripInvitationsCollection,
  getTripsCollection,
  getUsersCollection,
  toObjectId,
} from './platformMongo.js';
import { getPlatformConfig, requireConfigValue } from './platformConfig.js';
import { isOnboardingComplete } from './platformUsers.js';
import { TRIP_ROLES, addMemberIfCapacity, hasInviteCapacity } from './platformTrips.js';

export const INVITATION_STATUSES = Object.freeze({
  pending: 'pending',
  accepted: 'accepted',
  declined: 'declined',
  revoked: 'revoked',
  expired: 'expired',
});

// En esta etapa solo se puede invitar como `editor` (miembro colaborador de solo
// lectura). El frontend nunca elige el rol: es una constante server-side.
export const INVITATION_ROLE = TRIP_ROLES.editor;
export const INVITATION_TTL_DAYS = 7;

const INVITATION_TOKEN_BYTES = 32; // 256 bits de entropía
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1h
const RATE_LIMIT_MAX = 20; // invitaciones por owner por hora

// --- Helpers puros (unit-testables sin Mongo) ---

export function normalizeInvitedEmail(email) {
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new ValidationError('Ingresá un correo válido para invitar.');
  }
  return normalized;
}

export function generateInvitationToken() {
  return crypto.randomBytes(INVITATION_TOKEN_BYTES).toString('base64url');
}

function getInvitationSecret() {
  const { auth } = getPlatformConfig();
  return requireConfigValue(auth.authCodeSecret || auth.jwtSecret, 'ALAIA_AUTH_CODE_SECRET o ALAIA_JWT_SECRET');
}

// El token viaja en la URL; en la BD solo persiste su HMAC. La búsqueda es por
// igualdad indexada sobre `tokenHash` (no hace falta comparación constant-time:
// no se compara un secreto en memoria, se consulta un índice).
export function hashInvitationToken(token, { secret = getInvitationSecret() } = {}) {
  return crypto.createHmac('sha256', secret).update(String(token)).digest('hex');
}

export function invitationExpiresAt({ now = Date.now(), ttlDays = INVITATION_TTL_DAYS } = {}) {
  return new Date(now + ttlDays * 24 * 60 * 60 * 1000).toISOString();
}

// Expiración perezosa: una invitación `pending` cuyo `expiresAt` ya pasó se
// comporta como `expired` en toda lectura, sin cron. No muta el documento por sí
// sola (el caller la persiste best-effort cuando corresponde).
export function resolveInvitationStatus(invitation, { now = new Date() } = {}) {
  if (!invitation) return null;
  if (invitation.status === INVITATION_STATUSES.pending) {
    const expires = new Date(invitation.expiresAt).getTime();
    if (Number.isFinite(expires) && expires <= now.getTime()) {
      return INVITATION_STATUSES.expired;
    }
  }
  return invitation.status;
}

export function maskEmail(email) {
  const raw = String(email ?? '');
  const at = raw.indexOf('@');
  if (at <= 0) return '•••';
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  const head = local.slice(0, 1);
  return `${head}${'•'.repeat(Math.max(1, local.length - 1))}@${domain}`;
}

function previewDestination(destination) {
  if (!destination) return null;
  if (typeof destination === 'string') return { cityName: destination };
  return {
    ...(destination.cityName ? { cityName: destination.cityName } : {}),
    ...(destination.countryName ? { countryName: destination.countryName } : {}),
  };
}

// Respuesta pública del preview: JAMÁS expone miembros, ids, emails completos de
// terceros ni tokenHash. Solo lo necesario para renderizar la invitación.
export function publicInvitationPreview({ invitation, trip, ownerDisplayName, now = new Date() }) {
  const status = resolveInvitationStatus(invitation, { now });
  const preview = { status, requiresAuthentication: true };
  if (trip) {
    preview.trip = {
      title: trip.title,
      destination: previewDestination(trip.destination),
      ...(trip.startDateTime ? { startDateTime: trip.startDateTime } : {}),
      ...(trip.endDateTime ? { endDateTime: trip.endDateTime } : {}),
    };
  }
  if (ownerDisplayName) preview.ownerDisplayName = ownerDisplayName;
  if (invitation?.invitedEmail) preview.invitedEmailMasked = maskEmail(invitation.invitedEmail);
  return preview;
}

export function publicPendingInvitation(invitation) {
  return {
    invitationId: String(invitation._id),
    invitedEmailMasked: maskEmail(invitation.invitedEmail),
    status: invitation.status,
    role: invitation.role,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
  };
}

export function assertCanManageInvitations(owner) {
  if (!owner?.emailVerifiedAt) {
    throw new EmailNotVerifiedError('Verificá tu correo antes de invitar.');
  }
  if (!isOnboardingComplete(owner)) {
    throw new IncompleteProfileError();
  }
}

// --- Operaciones (colecciones inyectables para test) ---

let indexesEnsured = false;

export async function ensureInvitationIndexes(invitations) {
  if (indexesEnsured || typeof invitations.createIndex !== 'function') return;
  await invitations.createIndex({ tokenHash: 1 }, { unique: true });
  // Impide dos invitaciones pendientes para el mismo email+viaje (a nivel BD).
  await invitations.createIndex(
    { tripId: 1, invitedEmailNormalized: 1 },
    { unique: true, partialFilterExpression: { status: INVITATION_STATUSES.pending } },
  );
  await invitations.createIndex({ tripId: 1 });
  await invitations.createIndex({ createdBy: 1, createdAt: -1 });
  await invitations.createIndex({ expiresAt: 1 });
  indexesEnsured = true;
}

export async function enforceInvitationRateLimit({ invitations, createdBy, now = new Date() }) {
  const since = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS).toISOString();
  const count = await invitations.countDocuments({
    createdBy: toObjectId(createdBy, 'userId'),
    createdAt: { $gte: since },
  });
  if (count >= RATE_LIMIT_MAX) {
    throw new RateLimitError('Creaste muchas invitaciones en poco tiempo. Esperá un momento.');
  }
}

// Expira perezosamente las pendientes vencidas de un viaje (libera cupo y el
// índice único parcial para poder re-invitar). Best-effort e idempotente.
async function expireStalePending(invitations, tripObjectId, nowIso) {
  await invitations.updateMany(
    { tripId: tripObjectId, status: INVITATION_STATUSES.pending, expiresAt: { $lte: nowIso } },
    { $set: { status: INVITATION_STATUSES.expired, updatedAt: nowIso } },
  );
}

export async function createInvitation({
  trip,
  owner,
  email,
  collections = {},
  now = new Date().toISOString(),
  baseUrl = getPlatformConfig().app.baseUrl,
}) {
  assertCanManageInvitations(owner);
  const invitedEmailNormalized = normalizeInvitedEmail(email);
  const invitedEmail = String(email).trim();
  const tripObjectId = toObjectId(trip._id, 'tripId');

  // No invitarse a sí mismo.
  if (invitedEmailNormalized === String(owner.email ?? '').trim().toLowerCase()) {
    throw new ConflictError('Ese es tu correo: ya eres parte de esta historia.');
  }

  const invitations = collections.invitations ?? (await getTripInvitationsCollection());
  const users = collections.users ?? (await getUsersCollection());
  await ensureInvitationIndexes(invitations);
  await enforceInvitationRateLimit({ invitations, createdBy: owner._id, now: new Date(now) });

  // Si el email ya pertenece a un miembro del viaje → 409 (el owner ve a sus
  // miembros de todos modos; no filtramos existencia global de usuarios).
  const invitedUser = await users.findOne({ email: invitedEmailNormalized });
  if (invitedUser) {
    const isMember = (trip.members ?? []).some((m) => String(m.userId) === String(invitedUser._id));
    if (isMember) throw new ConflictError('Esta persona ya es parte de esta historia.');
  }

  await expireStalePending(invitations, tripObjectId, now);

  // Duplicado pendiente (además del índice único, para un error claro).
  const activePending = await invitations.findOne({
    tripId: tripObjectId,
    invitedEmailNormalized,
    status: INVITATION_STATUSES.pending,
  });
  if (activePending) throw new ConflictError('Ya hay una invitación pendiente para ese correo.');

  // Cupo: miembros + pendientes no vencidas < expectedTravelers.
  const membersCount = (trip.members ?? []).length;
  const pendingCount = await invitations.countDocuments({
    tripId: tripObjectId,
    status: INVITATION_STATUSES.pending,
  });
  if (!hasInviteCapacity({ membersCount, pendingCount, expectedTravelers: trip.expectedTravelers })) {
    throw new ConflictError('Este viaje ya alcanzó su cupo de personas.');
  }

  const token = generateInvitationToken();
  const doc = {
    tripId: tripObjectId,
    invitedEmail,
    invitedEmailNormalized,
    tokenHash: hashInvitationToken(token),
    role: INVITATION_ROLE,
    status: INVITATION_STATUSES.pending,
    createdBy: toObjectId(owner._id, 'userId'),
    createdAt: now,
    expiresAt: invitationExpiresAt({ now: new Date(now).getTime() }),
    updatedAt: now,
  };

  let insertedId;
  try {
    const result = await invitations.insertOne(doc);
    insertedId = result.insertedId;
  } catch (error) {
    if (error?.code === 11000) throw new ConflictError('Ya hay una invitación pendiente para ese correo.');
    throw error;
  }

  const inviteUrl = `${baseUrl}/invite/${token}`;
  return { invitation: { ...doc, _id: insertedId }, inviteUrl, expiresAt: doc.expiresAt };
}

export async function getInvitationByToken({ token, collections = {} }) {
  const invitations = collections.invitations ?? (await getTripInvitationsCollection());
  return invitations.findOne({ tokenHash: hashInvitationToken(token) });
}

// Preview público sanitizado: resuelve invitación + viaje + nombre del owner.
export async function getInvitationPreview({ token, collections = {}, now = new Date() }) {
  const invitation = await getInvitationByToken({ token, collections });
  if (!invitation) throw new NotFoundError('No encontramos esta invitación.');

  const trips = collections.trips ?? (await getTripsCollection());
  const users = collections.users ?? (await getUsersCollection());
  const trip = await trips.findOne({ _id: invitation.tripId });
  const owner = await users.findOne({ _id: invitation.createdBy });

  return publicInvitationPreview({ invitation, trip, ownerDisplayName: owner?.displayName, now });
}

function assertSessionEmailMatches(user, invitation) {
  const sessionEmail = String(user?.email ?? '').trim().toLowerCase();
  if (!sessionEmail || sessionEmail !== invitation.invitedEmailNormalized) {
    throw new ForbiddenError('Esta invitación fue enviada a otro correo.');
  }
}

export async function acceptInvitation({ token, user, collections = {}, now = new Date().toISOString() }) {
  if (!user?.emailVerifiedAt) {
    throw new EmailNotVerifiedError('Verificá tu correo para aceptar la invitación.');
  }
  const invitations = collections.invitations ?? (await getTripInvitationsCollection());
  const trips = collections.trips ?? (await getTripsCollection());

  const invitation = await invitations.findOne({ tokenHash: hashInvitationToken(token) });
  if (!invitation) throw new NotFoundError('No encontramos esta invitación.');

  const status = resolveInvitationStatus(invitation, { now: new Date(now) });

  // Idempotente: si el mismo usuario ya la aceptó, devolver OK.
  if (status === INVITATION_STATUSES.accepted) {
    if (String(invitation.acceptedBy) === String(user._id)) {
      return { tripId: String(invitation.tripId), alreadyAccepted: true };
    }
    throw new GoneError('Esta invitación ya fue utilizada.');
  }
  if (status !== INVITATION_STATUSES.pending) {
    if (status === INVITATION_STATUSES.expired && invitation.status === INVITATION_STATUSES.pending) {
      await invitations.updateOne(
        { _id: invitation._id, status: INVITATION_STATUSES.pending },
        { $set: { status: INVITATION_STATUSES.expired, updatedAt: now } },
      );
    }
    throw new GoneError('Esta invitación ya no está disponible.');
  }

  assertSessionEmailMatches(user, invitation);

  const result = await addMemberIfCapacity(trips, {
    tripId: invitation.tripId,
    userId: user._id,
    role: invitation.role || INVITATION_ROLE,
    now,
  });
  if (result.outcome === 'trip-not-found') throw new NotFoundError('Este viaje ya no existe.');
  if (result.outcome === 'capacity-full') throw new ConflictError('Este viaje ya está completo.');

  // 'added' o 'already-member' → marcar accepted (guard `pending` evita doble proceso en carrera).
  await invitations.updateOne(
    { _id: invitation._id, status: INVITATION_STATUSES.pending },
    {
      $set: {
        status: INVITATION_STATUSES.accepted,
        acceptedBy: toObjectId(user._id, 'userId'),
        acceptedAt: now,
        updatedAt: now,
      },
    },
  );
  return { tripId: String(invitation.tripId), alreadyAccepted: result.outcome === 'already-member' };
}

export async function declineInvitation({ token, user, collections = {}, now = new Date().toISOString() }) {
  const invitations = collections.invitations ?? (await getTripInvitationsCollection());
  const invitation = await invitations.findOne({ tokenHash: hashInvitationToken(token) });
  if (!invitation) throw new NotFoundError('No encontramos esta invitación.');

  const status = resolveInvitationStatus(invitation, { now: new Date(now) });

  if (status === INVITATION_STATUSES.declined) {
    if (String(invitation.declinedBy) === String(user._id)) return { status: INVITATION_STATUSES.declined };
    throw new GoneError('Esta invitación ya no está disponible.');
  }
  if (status !== INVITATION_STATUSES.pending) throw new GoneError('Esta invitación ya no está disponible.');

  assertSessionEmailMatches(user, invitation);

  await invitations.updateOne(
    { _id: invitation._id, status: INVITATION_STATUSES.pending },
    {
      $set: {
        status: INVITATION_STATUSES.declined,
        declinedBy: toObjectId(user._id, 'userId'),
        declinedAt: now,
        updatedAt: now,
      },
    },
  );
  return { status: INVITATION_STATUSES.declined };
}

export async function revokeInvitation({ tripId, invitationId, owner, collections = {}, now = new Date().toISOString() }) {
  const invitations = collections.invitations ?? (await getTripInvitationsCollection());
  const tripObjectId = toObjectId(tripId, 'tripId');
  const invObjectId = toObjectId(invitationId, 'invitationId');

  const invitation = await invitations.findOne({ _id: invObjectId, tripId: tripObjectId });
  if (!invitation) throw new NotFoundError('No encontramos esta invitación.');
  if (invitation.status !== INVITATION_STATUSES.pending) {
    throw new ConflictError('Solo se pueden revocar invitaciones pendientes.');
  }

  await invitations.updateOne(
    { _id: invObjectId, status: INVITATION_STATUSES.pending },
    {
      $set: {
        status: INVITATION_STATUSES.revoked,
        revokedBy: toObjectId(owner._id, 'userId'),
        revokedAt: now,
        updatedAt: now,
      },
    },
  );
  return { status: INVITATION_STATUSES.revoked };
}

export async function listPendingInvitations({ tripId, collections = {}, now = new Date().toISOString() }) {
  const invitations = collections.invitations ?? (await getTripInvitationsCollection());
  const tripObjectId = toObjectId(tripId, 'tripId');
  await expireStalePending(invitations, tripObjectId, now);
  const docs = await invitations
    .find({ tripId: tripObjectId, status: INVITATION_STATUSES.pending })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(publicPendingInvitation);
}
