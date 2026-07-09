import { MongoClient, ObjectId } from 'mongodb';

export const PLATFORM_COLLECTIONS = Object.freeze({
  users: 'users',
  trips: 'trips',
  storyPackages: 'storyPackages',
  tripStates: 'tripStates',
  memories: 'memories',
  mediaAssets: 'mediaAssets',
  storyMedia: 'storyMedia',
  authCodes: 'authCodes',
});

export function isPlatformMongoConfigured() {
  return Boolean(process.env.AURORA_MONGODB_URI);
}

let clientPromise = null;

function getClientPromise() {
  if (!isPlatformMongoConfigured()) {
    throw new Error('Aurora Platform necesita AURORA_MONGODB_URI configurado.');
  }
  if (!clientPromise) {
    clientPromise = globalThis._auroraPlatformMongoClientPromise;
  }
  if (!clientPromise) {
    const client = new MongoClient(process.env.AURORA_MONGODB_URI);
    clientPromise = client.connect();
    globalThis._auroraPlatformMongoClientPromise = clientPromise;
  }
  return clientPromise;
}

export async function getPlatformDb() {
  const client = await getClientPromise();
  return client.db();
}

export async function getPlatformCollection(name) {
  const db = await getPlatformDb();
  return db.collection(name);
}

export function toObjectId(value, fieldName = 'id') {
  if (value instanceof ObjectId) {
    return value;
  }
  if (typeof value === 'string' && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }
  throw new Error(`${fieldName} inválido.`);
}

export const getUsersCollection = () => getPlatformCollection(PLATFORM_COLLECTIONS.users);
export const getTripsCollection = () => getPlatformCollection(PLATFORM_COLLECTIONS.trips);
export const getStoryPackagesCollection = () => getPlatformCollection(PLATFORM_COLLECTIONS.storyPackages);
export const getTripStatesCollection = () => getPlatformCollection(PLATFORM_COLLECTIONS.tripStates);
export const getMemoriesCollection = () => getPlatformCollection(PLATFORM_COLLECTIONS.memories);
export const getMediaAssetsCollection = () => getPlatformCollection(PLATFORM_COLLECTIONS.mediaAssets);
export const getStoryMediaCollection = () => getPlatformCollection(PLATFORM_COLLECTIONS.storyMedia);
export const getAuthCodesCollection = () => getPlatformCollection(PLATFORM_COLLECTIONS.authCodes);
