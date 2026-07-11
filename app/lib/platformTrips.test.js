import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import {
  MVP_BASE_STORY_ID,
  createTripDocument,
  normalizeTripInput,
  normalizeTripPatch,
  publicTripDetail,
  publicTripSummary,
  roleForUser,
} from './platformTrips.js';

const BA_DESTINATION = {
  countryCode: 'ar',
  countryName: 'Argentina',
  cityId: 'nomi-111',
  cityName: 'Buenos Aires',
  adminName: 'CABA',
  latitude: -34.6037,
  longitude: -58.3816,
  timezone: 'America/Argentina/Buenos_Aires',
};

const PARIS_DESTINATION = {
  countryCode: 'fr',
  countryName: 'Francia',
  cityId: 'nomi-222',
  cityName: 'París',
  latitude: 48.8566,
  longitude: 2.3522,
  timezone: 'Europe/Paris',
};

function validInput(overrides = {}) {
  return {
    title: 'Buenos Aires',
    destination: BA_DESTINATION,
    startDateTime: '2026-07-18T09:30',
    endDateTime: '2026-07-21T22:00',
    travelCompanions: 'partner',
    expectedTravelers: 2,
    travelReason: 'honeymoon',
    travelStyle: ['romantic', 'gastronomic'],
    travelBudgetStyle: 'balanced',
    ...overrides,
  };
}

test('normalizeTripInput fuerza ba-2026 cuando el destino es Buenos Aires, AR', () => {
  const normalized = normalizeTripInput(validInput({ title: ' Buenos Aires ' }));
  assert.equal(normalized.baseStoryId, MVP_BASE_STORY_ID);
  assert.equal(normalized.destination.countryCode, 'AR');
  assert.equal(normalized.title, 'Buenos Aires');
});

test('normalizeTripInput deja baseStoryId null para destinos sin Story Package', () => {
  const normalized = normalizeTripInput(validInput({ destination: PARIS_DESTINATION }));
  assert.equal(normalized.baseStoryId, null);
});

test('normalizeTripInput exige título', () => {
  assert.throws(() => normalizeTripInput(validInput({ title: '  ' })), /título/);
});

test('normalizeTripInput exige país válido (ISO alpha-2)', () => {
  assert.throws(
    () => normalizeTripInput(validInput({ destination: { ...BA_DESTINATION, countryCode: 'Argentina' } })),
    /país del destino/,
  );
});

test('normalizeTripInput exige ciudad (cityId y cityName)', () => {
  assert.throws(
    () => normalizeTripInput(validInput({ destination: { ...BA_DESTINATION, cityName: '' } })),
    /necesita una ciudad/,
  );
});

test('normalizeTripInput exige coordenadas válidas', () => {
  assert.throws(
    () => normalizeTripInput(validInput({ destination: { ...BA_DESTINATION, latitude: 'no-number' } })),
    /coordenadas válidas/,
  );
});

test('normalizeTripInput exige timezone', () => {
  assert.throws(
    () => normalizeTripInput(validInput({ destination: { ...BA_DESTINATION, timezone: '' } })),
    /zona horaria/,
  );
});

test('normalizeTripInput exige fecha/hora con formato local (sin UTC)', () => {
  assert.throws(
    () => normalizeTripInput(validInput({ startDateTime: '2026-07-18T09:30:00.000Z' })),
    /llegada/,
  );
});

test('normalizeTripInput rechaza regreso anterior o igual a la llegada', () => {
  assert.throws(
    () => normalizeTripInput(validInput({ startDateTime: '2026-07-18T09:30', endDateTime: '2026-07-18T09:30' })),
    /después de la llegada/,
  );
  assert.throws(
    () => normalizeTripInput(validInput({ startDateTime: '2026-07-18T22:00', endDateTime: '2026-07-18T09:30' })),
    /después de la llegada/,
  );
});

test('normalizeTripInput permite viajes que empiezan y terminan el mismo día', () => {
  const normalized = normalizeTripInput(
    validInput({ startDateTime: '2026-07-18T09:00', endDateTime: '2026-07-18T21:00' }),
  );
  assert.equal(normalized.startDateTime, '2026-07-18T09:00');
  assert.equal(normalized.endDateTime, '2026-07-18T21:00');
});

test('normalizeTripInput normaliza el alojamiento cuando viene presente', () => {
  const normalized = normalizeTripInput(
    validInput({
      accommodation: { type: 'hotel', name: ' Hotel Aurora ', latitude: -34.6, longitude: -58.4 },
    }),
  );
  assert.deepEqual(normalized.accommodation, {
    type: 'hotel',
    name: 'Hotel Aurora',
    latitude: -34.6,
    longitude: -58.4,
  });
});

test('normalizeTripInput cae a "unknown" ante un tipo de alojamiento desconocido', () => {
  const normalized = normalizeTripInput(validInput({ accommodation: { type: 'castillo' } }));
  assert.equal(normalized.accommodation.type, 'unknown');
});

test('normalizeTripInput omite accommodation, travelContext y travelBudget cuando no vienen (son opcionales)', () => {
  const normalized = normalizeTripInput(validInput());
  assert.equal('accommodation' in normalized, false);
  assert.equal('travelContext' in normalized, false);
  assert.equal('travelBudget' in normalized, false);
});

test('normalizeTripInput recorta travelContext y respeta el límite de largo', () => {
  const normalized = normalizeTripInput(validInput({ travelContext: '  Nos gusta caminar.  ' }));
  assert.equal(normalized.travelContext, 'Nos gusta caminar.');

  assert.throws(
    () => normalizeTripInput(validInput({ travelContext: 'x'.repeat(501) })),
    /no puede superar/,
  );
});

test('normalizeTripInput exige travelCompanions válido (campo obligatorio, sin opción de omitir)', () => {
  assert.throws(() => normalizeTripInput(validInput({ travelCompanions: undefined })), /viven esta historia/);
  assert.throws(() => normalizeTripInput(validInput({ travelCompanions: 'mascotas' })), /viven esta historia/);
  assert.equal(normalizeTripInput(validInput({ travelCompanions: 'solo' })).travelCompanions, 'solo');
});

test('normalizeTripInput exige expectedTravelers entero positivo dentro de un rango razonable', () => {
  assert.throws(() => normalizeTripInput(validInput({ expectedTravelers: 0 })), /cantidad de personas/);
  assert.throws(() => normalizeTripInput(validInput({ expectedTravelers: 1.5 })), /cantidad de personas/);
  assert.throws(() => normalizeTripInput(validInput({ expectedTravelers: 51 })), /cantidad de personas/);
  assert.equal(normalizeTripInput(validInput({ expectedTravelers: '3' })).expectedTravelers, 3);
});

test('normalizeTripInput exige travelReason válido', () => {
  assert.throws(() => normalizeTripInput(validInput({ travelReason: 'fiesta' })), /qué los trae/);
  assert.equal(normalizeTripInput(validInput({ travelReason: 'first_time' })).travelReason, 'first_time');
});

test('normalizeTripInput exige entre 1 y 2 estilos de viaje válidos', () => {
  assert.throws(() => normalizeTripInput(validInput({ travelStyle: [] })), /al menos un estilo/);
  assert.throws(
    () => normalizeTripInput(validInput({ travelStyle: ['romantic', 'cultural', 'nature'] })),
    /como máximo 2/,
  );
  assert.throws(() => normalizeTripInput(validInput({ travelStyle: ['romantic', 'volador'] })), /estilo de viaje/);
  assert.deepEqual(normalizeTripInput(validInput({ travelStyle: ['romantic'] })).travelStyle, ['romantic']);
});

test('normalizeTripInput exige travelBudgetStyle válido', () => {
  assert.throws(() => normalizeTripInput(validInput({ travelBudgetStyle: 'infinito' })), /vivir este viaje/);
});

test('normalizeTripInput exige travelBudget (monto + moneda) solo cuando el estilo es "defined"', () => {
  assert.throws(
    () => normalizeTripInput(validInput({ travelBudgetStyle: 'defined' })),
    /monto del presupuesto/,
  );
  assert.throws(
    () =>
      normalizeTripInput(
        validInput({ travelBudgetStyle: 'defined', travelBudget: { amount: 1000, currency: 'pesos' } }),
      ),
    /moneda del presupuesto/,
  );

  const normalized = normalizeTripInput(
    validInput({ travelBudgetStyle: 'defined', travelBudget: { amount: 1500, currency: 'usd' } }),
  );
  assert.deepEqual(normalized.travelBudget, { amount: 1500, currency: 'USD', style: 'defined' });

  // Con otro estilo, aunque venga un travelBudget en el input, no se persiste.
  const ignored = normalizeTripInput(
    validInput({ travelBudgetStyle: 'balanced', travelBudget: { amount: 1500, currency: 'usd' } }),
  );
  assert.equal('travelBudget' in ignored, false);
});

test('createTripDocument deja al creador como owner y member owner', () => {
  const userId = new ObjectId();
  const trip = createTripDocument(validInput(), userId, { now: '2026-07-09T12:00:00.000Z' });

  assert.equal(String(trip.ownerId), String(userId));
  assert.equal(trip.members.length, 1);
  assert.equal(String(trip.members[0].userId), String(userId));
  assert.equal(trip.members[0].role, 'owner');
  assert.equal(trip.status, 'active');
  assert.equal(trip.baseStoryId, MVP_BASE_STORY_ID);
  assert.equal(trip.travelCompanions, 'partner');
  assert.equal(trip.expectedTravelers, 2);
});

// baseStoryId es la única fuente de verdad: storyPackageId era campo muerto
// (siempre null, nadie lo leía) y se dejó de escribir.
test('createTripDocument ya no escribe el campo muerto storyPackageId', () => {
  const trip = createTripDocument(validInput(), new ObjectId(), { now: '2026-07-09T12:00:00.000Z' });
  assert.equal('storyPackageId' in trip, false);
});

test('roleForUser: el creador es owner; otro usuario no tiene rol (no es miembro)', () => {
  const owner = new ObjectId();
  const stranger = new ObjectId();
  const trip = createTripDocument(validInput(), owner, { now: '2026-07-09T12:00:00.000Z' });

  assert.equal(roleForUser(trip, owner), 'owner');
  // Base de la autorización: un no-miembro no tiene rol → requireTripMember (403)
  // y el filtro `members.userId` de listTrips lo dejan afuera.
  assert.equal(roleForUser(trip, stranger), null);
  assert.equal(publicTripSummary(trip, stranger).role, null);
});

test('normalizeTripPatch permite solo title, destination y status válidos', () => {
  assert.deepEqual(
    normalizeTripPatch({ title: ' Nuevo ', destination: ' Córdoba ', status: 'archived', ignored: true }),
    { title: 'Nuevo', destination: 'Córdoba', status: 'archived' }
  );
  assert.throws(() => normalizeTripPatch({ status: 'deleted' }), /Status de viaje inválido/);
});

test('publicTripSummary y publicTripDetail exponen el modelo narrativo completo', () => {
  const userId = new ObjectId();
  const trip = {
    _id: new ObjectId(),
    title: 'Buenos Aires',
    destination: BA_DESTINATION,
    baseStoryId: 'ba-2026',
    startDateTime: '2026-07-18T09:30',
    endDateTime: '2026-07-21T22:00',
    accommodation: { type: 'hotel', name: 'Hotel Aurora' },
    travelContext: 'Nos gusta caminar.',
    travelCompanions: 'partner',
    expectedTravelers: 2,
    travelReason: 'honeymoon',
    travelStyle: ['romantic', 'gastronomic'],
    travelBudgetStyle: 'defined',
    travelBudget: { amount: 1500, currency: 'USD', style: 'defined' },
    status: 'active',
    updatedAt: '2026-07-09T12:00:00.000Z',
    createdAt: '2026-07-09T11:00:00.000Z',
    members: [{ userId, role: 'owner', joinedAt: '2026-07-09T11:00:00.000Z' }],
  };

  assert.deepEqual(publicTripSummary(trip, userId), {
    id: String(trip._id),
    title: 'Buenos Aires',
    destination: BA_DESTINATION,
    baseStoryId: 'ba-2026',
    status: 'active',
    role: 'owner',
    updatedAt: '2026-07-09T12:00:00.000Z',
    startDateTime: '2026-07-18T09:30',
    endDateTime: '2026-07-21T22:00',
    accommodation: { type: 'hotel', name: 'Hotel Aurora' },
    travelContext: 'Nos gusta caminar.',
    travelCompanions: 'partner',
    expectedTravelers: 2,
    travelReason: 'honeymoon',
    travelStyle: ['romantic', 'gastronomic'],
    travelBudgetStyle: 'defined',
    travelBudget: { amount: 1500, currency: 'USD', style: 'defined' },
  });
  assert.equal(publicTripDetail(trip, userId).members[0].userId, String(userId));
});

test('publicTripSummary conserva el shape legacy intacto (destination string, sin fechas ni perfil narrativo)', () => {
  const userId = new ObjectId();
  const legacyTrip = {
    _id: new ObjectId(),
    title: 'Buenos Aires',
    destination: 'Buenos Aires',
    baseStoryId: 'ba-2026',
    status: 'active',
    updatedAt: '2026-07-09T12:00:00.000Z',
    members: [{ userId, role: 'owner', joinedAt: '2026-07-09T11:00:00.000Z' }],
  };

  const summary = publicTripSummary(legacyTrip, userId);
  assert.deepEqual(summary, {
    id: String(legacyTrip._id),
    title: 'Buenos Aires',
    destination: 'Buenos Aires',
    baseStoryId: 'ba-2026',
    status: 'active',
    role: 'owner',
    updatedAt: '2026-07-09T12:00:00.000Z',
  });
  assert.equal('startDateTime' in summary, false);
  assert.equal('accommodation' in summary, false);
  assert.equal('travelCompanions' in summary, false);
  assert.equal('travelStyle' in summary, false);
});

test('publicTripSummary conserva viajes de la etapa anterior (sin perfil narrativo, pero con fechas/alojamiento)', () => {
  const userId = new ObjectId();
  const previousStageTrip = {
    _id: new ObjectId(),
    title: 'Buenos Aires',
    destination: BA_DESTINATION,
    baseStoryId: 'ba-2026',
    startDateTime: '2026-07-18T09:30',
    endDateTime: '2026-07-21T22:00',
    status: 'active',
    updatedAt: '2026-07-09T12:00:00.000Z',
    members: [{ userId, role: 'owner', joinedAt: '2026-07-09T11:00:00.000Z' }],
  };

  const summary = publicTripSummary(previousStageTrip, userId);
  assert.equal(summary.startDateTime, '2026-07-18T09:30');
  assert.equal('travelCompanions' in summary, false);
  assert.equal('travelBudgetStyle' in summary, false);
});
