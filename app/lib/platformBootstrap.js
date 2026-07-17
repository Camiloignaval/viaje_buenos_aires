import { getTripsCollection, getUsersCollection, toObjectId } from './platformMongo.js';
import { normalizeEmail } from './platformAuthCodes.js';
import { buenosAiresStoryManifest } from '../src/content/stories/buenos-aires-2026/manifest.js';
import { TRIP_ROLES, createTripDocument } from './platformTrips.js';

// Clave estable para identificar el viaje semilla. NUNCA se deduplica por título:
// dos viajes pueden llamarse igual, pero solo uno lleva este bootstrapKey.
export const BUENOS_AIRES_BOOTSTRAP_KEY = 'buenos-aires-2026';

// Datos del viaje semilla. Solo se aplican al CREAR (via $setOnInsert): si el
// viaje ya existe (creado por el wizard con datos reales), no se pisan.
export function buenosAiresTripInput() {
  return {
    title: 'Buenos Aires, 2026',
    destination: {
      countryCode: 'AR',
      countryName: 'Argentina',
      cityId: 'nomi-buenos-aires',
      cityName: 'Buenos Aires',
      adminName: 'CABA',
      latitude: -34.6037,
      longitude: -58.3816,
      timezone: 'America/Argentina/Buenos_Aires',
    },
    startDateTime: '2026-07-18T09:30',
    endDateTime: '2026-07-21T22:00',
    baseStoryId: buenosAiresStoryManifest.catalogId,
    travelCompanions: 'partner',
    expectedTravelers: 2,
    travelReason: 'vacation',
    travelStyle: ['romantic', 'gastronomic'],
    travelBudgetStyle: 'balanced',
  };
}

// Documento completo del viaje semilla. Reusa createTripDocument (misma validación
// y forma que un viaje real) y verifica el invariante baseStoryId = "ba-2026".
export function buildBuenosAiresTripDocument(userId, { now = new Date().toISOString() } = {}) {
  const doc = createTripDocument(buenosAiresTripInput(), userId, { now });
  if (doc.baseStoryId !== buenosAiresStoryManifest.catalogId) {
    throw new Error(`El viaje semilla debe usar baseStoryId="${buenosAiresStoryManifest.catalogId}" (obtuvo "${doc.baseStoryId}").`);
  }
  return { ...doc, bootstrapKey: BUENOS_AIRES_BOOTSTRAP_KEY };
}

// Asocia idempotentemente el viaje de Buenos Aires al usuario owner real.
// - Falla claro si el usuario no existe (NO lo crea).
// - Upsert por bootstrapKey: en UPDATE no toca fechas ni members (no pisa datos
//   reales ni miembros que ya aceptaron); solo asegura ownerId/baseStoryId.
// - Asegura al owner en members sin clobberear a otros.
// - Seguro al reejecutarse: nunca duplica.
export async function bootstrapBuenosAiresTrip({ email, collections = {}, now = new Date().toISOString() }) {
  const normalizedEmail = normalizeEmail(email);
  const users = collections.users ?? (await getUsersCollection());
  const trips = collections.trips ?? (await getTripsCollection());

  const user = await users.findOne({ email: normalizedEmail });
  if (!user) {
    throw new Error('No existe un usuario con ese correo. Inicia sesión con esa cuenta antes de asociar el viaje.');
  }

  if (typeof trips.createIndex === 'function') {
    await trips.createIndex({ bootstrapKey: 1 }, { unique: true, sparse: true });
  }

  const ownerId = toObjectId(user._id, 'userId');
  const fresh = buildBuenosAiresTripDocument(ownerId, { now });

  const result = await trips.updateOne(
    { bootstrapKey: BUENOS_AIRES_BOOTSTRAP_KEY },
    { $setOnInsert: fresh },
    { upsert: true },
  );
  const created = Boolean(result.upsertedCount || result.upsertedId);

  // Mongo no permite escribir el mismo path en $setOnInsert y $set dentro de
  // una misma operación (por ejemplo ownerId/baseStoryId/updatedAt). Por eso el
  // upsert crea el documento y este update separado asegura los campos móviles.
  await trips.updateOne(
    { bootstrapKey: BUENOS_AIRES_BOOTSTRAP_KEY },
    { $set: { ownerId, baseStoryId: buenosAiresStoryManifest.catalogId, updatedAt: now } },
  );

  // Asegura al owner en members SIN pisar a otros miembros (solo pushea si falta).
  await trips.updateOne(
    { bootstrapKey: BUENOS_AIRES_BOOTSTRAP_KEY, 'members.userId': { $ne: ownerId } },
    { $push: { members: { userId: ownerId, role: TRIP_ROLES.owner, joinedAt: now } }, $set: { updatedAt: now } },
  );

  const trip = await trips.findOne({ bootstrapKey: BUENOS_AIRES_BOOTSTRAP_KEY });
  return { outcome: created ? 'created' : 'updated', tripId: String(trip._id) };
}
