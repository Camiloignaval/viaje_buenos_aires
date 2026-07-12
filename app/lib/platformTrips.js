import { toObjectId } from './platformMongo.js';
import { MVP_BASE_STORY_ID, isRegisteredBaseStory } from './platformStories.js';

// El catálogo (platformStories) es el dueño del id canónico; se re-exporta para
// no duplicar la constante ni romper importadores existentes.
export { MVP_BASE_STORY_ID };

export const TRIP_STATUSES = Object.freeze({
  active: 'active',
  archived: 'archived',
});

// Roles de miembro. `owner` administra (invitar/revocar/editar); `editor` es un
// miembro colaborador de solo lectura en este MVP (lista el viaje, abre Portada y
// Experience, lee contenido conectado). No hay más roles todavía.
export const TRIP_ROLES = Object.freeze({
  owner: 'owner',
  editor: 'editor',
});

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const TRAVEL_CONTEXT_MAX_LENGTH = 500;
const MAX_TRAVEL_STYLES = 2;
const MAX_EXPECTED_TRAVELERS = 50;
const ACCOMMODATION_TYPES = Object.freeze({
  hotel: 'hotel',
  address: 'address',
  neighborhood: 'neighborhood',
  unknown: 'unknown',
});
export const TRAVEL_COMPANIONS = Object.freeze({
  partner: 'partner',
  family: 'family',
  friends: 'friends',
  coworkers: 'coworkers',
  solo: 'solo',
  other: 'other',
});
export const TRAVEL_REASONS = Object.freeze({
  honeymoon: 'honeymoon',
  birthday: 'birthday',
  vacation: 'vacation',
  celebration: 'celebration',
  family_reunion: 'family_reunion',
  work: 'work',
  studies: 'studies',
  first_time: 'first_time',
});
export const TRAVEL_STYLES = Object.freeze({
  romantic: 'romantic',
  relaxed: 'relaxed',
  adventurous: 'adventurous',
  cultural: 'cultural',
  gastronomic: 'gastronomic',
  photographic: 'photographic',
  nightlife: 'nightlife',
  nature: 'nature',
  shopping: 'shopping',
});
export const TRAVEL_BUDGET_STYLES = Object.freeze({
  carefree: 'carefree',
  balanced: 'balanced',
  simple: 'simple',
  defined: 'defined',
});

function normalizeDestination(input = {}) {
  const countryCode = String(input.countryCode ?? '').trim().toUpperCase();
  const countryName = String(input.countryName ?? '').trim();
  const cityId = String(input.cityId ?? '').trim();
  const cityName = String(input.cityName ?? '').trim();
  const adminName = input.adminName ? String(input.adminName).trim() : '';
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const timezone = String(input.timezone ?? '').trim();

  if (!COUNTRY_CODE_PATTERN.test(countryCode)) {
    throw new Error('El país del destino es inválido.');
  }
  if (!countryName) {
    throw new Error('El destino necesita el nombre del país.');
  }
  if (!cityId || !cityName) {
    throw new Error('El viaje necesita una ciudad.');
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('La ciudad necesita coordenadas válidas.');
  }
  if (!timezone) {
    throw new Error('La ciudad necesita una zona horaria.');
  }

  return {
    countryCode,
    countryName,
    cityId,
    cityName,
    ...(adminName ? { adminName } : {}),
    latitude,
    longitude,
    timezone,
  };
}

function normalizeDateTime(value, label) {
  const raw = String(value ?? '').trim();
  if (!DATETIME_LOCAL_PATTERN.test(raw)) {
    throw new Error(`La fecha y hora de ${label} es inválida.`);
  }
  return raw;
}

function normalizeAccommodation(input) {
  if (input == null) return undefined;

  const type = ACCOMMODATION_TYPES[input.type] ?? ACCOMMODATION_TYPES.unknown;
  const accommodation = { type };

  if (input.name) accommodation.name = String(input.name).trim();
  if (input.address) accommodation.address = String(input.address).trim();
  if (input.neighborhood) accommodation.neighborhood = String(input.neighborhood).trim();
  if (input.placeId) accommodation.placeId = String(input.placeId).trim();

  if (input.latitude != null && input.longitude != null) {
    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      accommodation.latitude = latitude;
      accommodation.longitude = longitude;
    }
  }

  return accommodation;
}

function normalizeTravelContext(value) {
  if (value == null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  if (text.length > TRAVEL_CONTEXT_MAX_LENGTH) {
    throw new Error(`El contexto no puede superar los ${TRAVEL_CONTEXT_MAX_LENGTH} caracteres.`);
  }
  return text;
}

// Quiénes, cuántos, por qué y cómo — el perfil narrativo del viaje (spec
// "Alaia"). Son preguntas obligatorias en el wizard (sin opción de omitir,
// a diferencia de accommodation/travelContext): se validan igual de estricto
// en el server, no solo en el cliente.
function normalizeTravelCompanions(value) {
  const key = String(value ?? '');
  if (!TRAVEL_COMPANIONS[key]) {
    throw new Error('Cuéntanos quiénes viven esta historia contigo.');
  }
  return key;
}

function normalizeExpectedTravelers(value) {
  const travelers = Number(value);
  if (!Number.isInteger(travelers) || travelers < 1 || travelers > MAX_EXPECTED_TRAVELERS) {
    throw new Error('La cantidad de personas es inválida.');
  }
  return travelers;
}

function normalizeTravelReason(value) {
  const key = String(value ?? '');
  if (!TRAVEL_REASONS[key]) {
    throw new Error('Cuéntanos qué los trae hasta aquí.');
  }
  return key;
}

function normalizeTravelStyle(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Elige al menos un estilo de viaje.');
  }
  if (value.length > MAX_TRAVEL_STYLES) {
    throw new Error(`Elige como máximo ${MAX_TRAVEL_STYLES} estilos de viaje.`);
  }
  const styles = [...new Set(value.map((item) => String(item)))];
  if (styles.some((style) => !TRAVEL_STYLES[style])) {
    throw new Error('El estilo de viaje es inválido.');
  }
  return styles;
}

function normalizeTravelBudgetStyle(value) {
  const key = String(value ?? '');
  if (!TRAVEL_BUDGET_STYLES[key]) {
    throw new Error('Cuéntanos cómo les gustaría vivir este viaje.');
  }
  return key;
}

// El monto es SOLO si el estilo elegido es "definir un presupuesto" — para
// cualquier otro estilo, no se persiste (no tiene sentido guardar un monto
// que la persona no quiso dar).
function normalizeTravelBudget(budgetStyle, input) {
  if (budgetStyle !== TRAVEL_BUDGET_STYLES.defined) return undefined;

  const amount = Number(input?.amount);
  const currency = String(input?.currency ?? '').trim().toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El monto del presupuesto es inválido.');
  }
  if (!CURRENCY_CODE_PATTERN.test(currency)) {
    throw new Error('La moneda del presupuesto es inválida.');
  }

  return { amount, currency, style: budgetStyle };
}

// Mapa destino → historia curada. Agregar un destino con historia = sumar una
// regla acá (primer match gana). Un destino sin regla queda con baseStoryId
// null: el viaje se crea igual (Experience mostrará el estado honesto "sin
// historia"), no hace falta IA ni itinerario todavía.
const DESTINATION_STORY_MAP = [
  {
    storyId: MVP_BASE_STORY_ID,
    match: (d) => d.countryCode === 'AR' && d.cityName.trim().toLowerCase() === 'buenos aires',
  },
];

// Invariante de integridad: toda regla debe apuntar a un id que exista en el
// catálogo. Si alguien agrega un destino con un id sin registrar, esto falla
// en el arranque en vez de crear trips que nunca resuelven su historia.
for (const { storyId } of DESTINATION_STORY_MAP) {
  if (!isRegisteredBaseStory(storyId)) {
    throw new Error(`DESTINATION_STORY_MAP referencia un storyId inexistente en el catálogo: "${storyId}"`);
  }
}

function deriveBaseStoryId(destination) {
  const rule = DESTINATION_STORY_MAP.find(({ match }) => match(destination));
  return rule ? rule.storyId : null;
}

export function normalizeTripInput(input = {}) {
  const title = String(input.title ?? '').trim();
  if (!title) {
    throw new Error('El viaje necesita un título.');
  }

  const destination = normalizeDestination(input.destination);
  const startDateTime = normalizeDateTime(input.startDateTime, 'llegada');
  const endDateTime = normalizeDateTime(input.endDateTime, 'regreso');
  if (endDateTime <= startDateTime) {
    throw new Error('La vuelta debe ser después de la llegada.');
  }

  const accommodation = normalizeAccommodation(input.accommodation);
  const travelContext = normalizeTravelContext(input.travelContext);

  const travelCompanions = normalizeTravelCompanions(input.travelCompanions);
  const expectedTravelers = normalizeExpectedTravelers(input.expectedTravelers);
  const travelReason = normalizeTravelReason(input.travelReason);
  const travelStyle = normalizeTravelStyle(input.travelStyle);
  const travelBudgetStyle = normalizeTravelBudgetStyle(input.travelBudgetStyle);
  const travelBudget = normalizeTravelBudget(travelBudgetStyle, input.travelBudget);

  return {
    title,
    destination,
    startDateTime,
    endDateTime,
    baseStoryId: deriveBaseStoryId(destination),
    travelCompanions,
    expectedTravelers,
    travelReason,
    travelStyle,
    travelBudgetStyle,
    ...(accommodation ? { accommodation } : {}),
    ...(travelContext ? { travelContext } : {}),
    ...(travelBudget ? { travelBudget } : {}),
  };
}

export function createTripDocument(input, userId, { now = new Date().toISOString() } = {}) {
  const normalized = normalizeTripInput(input);
  const ownerId = toObjectId(userId, 'userId');

  return {
    ...normalized,
    ownerId,
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

// Cupo del viaje = `expectedTravelers` (total esperado, incluye al owner). Chequeo
// puro para el momento de CREAR una invitación: no sobre-invitar contando miembros
// actuales + invitaciones pendientes no vencidas. Las vencidas/revocadas/rechazadas
// no reservan cupo (no se cuentan). El chequeo de ACEPTAR es atómico y vive abajo.
export function hasInviteCapacity({ membersCount, pendingCount, expectedTravelers }) {
  return membersCount + pendingCount < expectedTravelers;
}

// Alta atómica de miembro: UNA sola operación que respeta el cupo y no duplica.
// La BD es la única autoridad del cupo (evita carreras entre dos aceptaciones por
// el último lugar). El `$expr` compara el tamaño real de `members` contra
// `expectedTravelers`; `$ne` impide duplicar. Devuelve el desenlace para que el
// llamador distinga alta / ya-miembro (idempotente) / cupo lleno sin condiciones
// de carrera. No confía en ningún cálculo previo del frontend.
export async function addMemberIfCapacity(trips, { tripId, userId, role = TRIP_ROLES.editor, now = new Date().toISOString() }) {
  const tripObjectId = toObjectId(tripId, 'tripId');
  const userObjectId = toObjectId(userId, 'userId');

  const result = await trips.updateOne(
    {
      _id: tripObjectId,
      'members.userId': { $ne: userObjectId },
      $expr: { $lt: [{ $size: '$members' }, '$expectedTravelers'] },
    },
    {
      $push: { members: { userId: userObjectId, role, joinedAt: now } },
      $set: { updatedAt: now },
    }
  );

  if (result.matchedCount === 1) {
    return { outcome: 'added' };
  }

  // matchedCount 0 → o ya es miembro (idempotente) o no hay cupo. Un findOne
  // desambigua sin reservar cupo ni arriesgar una doble alta.
  const trip = await trips.findOne({ _id: tripObjectId });
  if (!trip) return { outcome: 'trip-not-found' };
  const alreadyMember = (trip.members ?? []).some((m) => String(m.userId) === String(userObjectId));
  if (alreadyMember) return { outcome: 'already-member' };
  return { outcome: 'capacity-full' };
}

// Los viajes legacy tienen `destination` como string y no tienen fechas,
// alojamiento ni contexto: se exponen tal cual, sin inventar valores.
export function publicTripSummary(trip, userId) {
  const summary = {
    id: String(trip._id),
    title: trip.title,
    destination: trip.destination,
    baseStoryId: trip.baseStoryId,
    status: trip.status,
    role: roleForUser(trip, userId),
    updatedAt: trip.updatedAt,
  };

  if (trip.startDateTime) summary.startDateTime = trip.startDateTime;
  if (trip.endDateTime) summary.endDateTime = trip.endDateTime;
  if (trip.accommodation) summary.accommodation = trip.accommodation;
  if (trip.travelContext) summary.travelContext = trip.travelContext;
  if (trip.travelCompanions) summary.travelCompanions = trip.travelCompanions;
  if (trip.expectedTravelers) summary.expectedTravelers = trip.expectedTravelers;
  if (trip.travelReason) summary.travelReason = trip.travelReason;
  if (trip.travelStyle) summary.travelStyle = trip.travelStyle;
  if (trip.travelBudgetStyle) summary.travelBudgetStyle = trip.travelBudgetStyle;
  if (trip.travelBudget) summary.travelBudget = trip.travelBudget;

  return summary;
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
