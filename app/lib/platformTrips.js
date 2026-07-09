import { toObjectId } from './platformMongo.js';

export const MVP_BASE_STORY_ID = 'ba-2026';
export const TRIP_STATUSES = Object.freeze({
  active: 'active',
  archived: 'archived',
});

export function normalizeTripInput(input = {}) {
  const title = String(input.title ?? '').trim();
  const destination = String(input.destination ?? '').trim();

  if (!title) {
    throw new Error('El viaje necesita un título.');
  }
  if (!destination) {
    throw new Error('El viaje necesita un destino.');
  }

  return { title, destination, baseStoryId: MVP_BASE_STORY_ID };
}

export function createTripDocument(input, userId, { now = new Date().toISOString() } = {}) {
  const normalized = normalizeTripInput(input);
  const ownerId = toObjectId(userId, 'userId');

  return {
    ...normalized,
    ownerId,
    storyPackageId: null,
    members: [{ userId: ownerId, role: 'owner', joinedAt: now }],
    status: TRIP_STATUSES.active,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeTripPatch(input = {}) {
  const patch = {};

  if ('title' in input) {
    const title = String(input.title ?? '').trim();
    if (!title) {
      throw new Error('El título no puede quedar vacío.');
    }
    patch.title = title;
  }

  if ('destination' in input) {
    const destination = String(input.destination ?? '').trim();
    if (!destination) {
      throw new Error('El destino no puede quedar vacío.');
    }
    patch.destination = destination;
  }

  if ('status' in input) {
    if (!Object.values(TRIP_STATUSES).includes(input.status)) {
      throw new Error('Status de viaje inválido.');
    }
    patch.status = input.status;
  }

  return patch;
}

export function roleForUser(trip, userId) {
  const member = trip.members?.find((item) => String(item.userId) === String(userId));
  return member?.role ?? null;
}

export function publicTripSummary(trip, userId) {
  return {
    id: String(trip._id),
    title: trip.title,
    destination: trip.destination,
    baseStoryId: trip.baseStoryId,
    status: trip.status,
    role: roleForUser(trip, userId),
    updatedAt: trip.updatedAt,
  };
}

export function publicTripDetail(trip, userId) {
  return {
    ...publicTripSummary(trip, userId),
    createdAt: trip.createdAt,
    members: (trip.members ?? []).map((member) => ({
      userId: String(member.userId),
      role: member.role,
      joinedAt: member.joinedAt,
    })),
  };
}
