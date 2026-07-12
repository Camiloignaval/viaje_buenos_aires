import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';

// Secreto/baseUrl para que hashInvitationToken y las inviteUrl funcionen sin Vercel.
process.env.ALAIA_JWT_SECRET = process.env.ALAIA_JWT_SECRET || 'test-secret-invitations';
process.env.APP_BASE_URL = 'https://alaia.test';

const {
  INVITATION_STATUSES,
  INVITATION_ROLE,
  assertCanManageInvitations,
  acceptInvitation,
  createInvitation,
  declineInvitation,
  generateInvitationToken,
  getInvitationPreview,
  hashInvitationToken,
  invitationExpiresAt,
  listPendingInvitations,
  maskEmail,
  normalizeInvitedEmail,
  publicInvitationPreview,
  resolveInvitationStatus,
  revokeInvitation,
} = await import('./platformInvitations.js');

// --- Fake Mongo in-memory (subset de operadores realmente usados) ---

function idEq(a, b) {
  return String(a) === String(b);
}

function getPath(doc, path) {
  if (path.includes('.')) {
    const [head, ...rest] = path.split('.');
    const sub = doc?.[head];
    if (Array.isArray(sub)) return sub.map((item) => getPath(item, rest.join('.')));
    if (sub == null) return undefined;
    return getPath(sub, rest.join('.'));
  }
  return doc?.[path];
}

function matchField(val, cond) {
  if (cond && typeof cond === 'object' && !(cond instanceof ObjectId) && !Array.isArray(cond)) {
    for (const [op, target] of Object.entries(cond)) {
      if (op === '$ne') { if (idEq(val, target)) return false; }
      else if (op === '$gte') { if (!(val >= target)) return false; }
      else if (op === '$lte') { if (!(val <= target)) return false; }
      else return false;
    }
    return true;
  }
  return idEq(val, cond);
}

function evalOperand(doc, operand) {
  if (typeof operand === 'string' && operand.startsWith('$')) return getPath(doc, operand.slice(1));
  if (operand && operand.$size != null) {
    const arr = evalOperand(doc, operand.$size);
    return Array.isArray(arr) ? arr.length : 0;
  }
  return operand;
}

function matchesQuery(doc, query) {
  for (const [key, cond] of Object.entries(query)) {
    if (key === '$expr') {
      const [a, b] = cond.$lt.map((op) => evalOperand(doc, op));
      if (!(a < b)) return false;
      continue;
    }
    const val = getPath(doc, key);
    if (Array.isArray(val) && key.includes('.')) {
      if (cond && typeof cond === 'object' && '$ne' in cond) {
        if (val.some((v) => idEq(v, cond.$ne))) return false;
      } else if (!val.some((v) => matchField(v, cond))) {
        return false;
      }
    } else if (!matchField(val, cond)) {
      return false;
    }
  }
  return true;
}

function applyUpdate(doc, update) {
  if (update.$set) Object.assign(doc, update.$set);
  if (update.$push) {
    for (const [k, v] of Object.entries(update.$push)) {
      doc[k] = doc[k] ?? [];
      doc[k].push(v);
    }
  }
}

function makeCollection(initial = []) {
  const docs = initial.map((d) => ({ ...d }));
  return {
    docs,
    async createIndex() {},
    async insertOne(doc) {
      const _id = doc._id ?? new ObjectId();
      docs.push({ ...doc, _id });
      return { insertedId: _id };
    },
    async findOne(query) {
      return docs.find((d) => matchesQuery(d, query)) ?? null;
    },
    async countDocuments(query) {
      return docs.filter((d) => matchesQuery(d, query)).length;
    },
    async updateOne(filter, update) {
      const d = docs.find((x) => matchesQuery(x, filter));
      if (!d) return { matchedCount: 0, modifiedCount: 0 };
      applyUpdate(d, update);
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async updateMany(filter, update) {
      const matched = docs.filter((x) => matchesQuery(x, filter));
      matched.forEach((d) => applyUpdate(d, update));
      return { matchedCount: matched.length, modifiedCount: matched.length };
    },
    find(query) {
      const result = docs.filter((d) => matchesQuery(d, query));
      return { sort() { return this; }, async toArray() { return result; } };
    },
  };
}

// --- Fixtures ---

const OWNER_ID = new ObjectId();
const TRIP_ID = new ObjectId();

function validOwner(overrides = {}) {
  return {
    _id: OWNER_ID,
    email: 'owner@alaia.test',
    emailVerifiedAt: '2026-07-01T00:00:00.000Z',
    onboardingCompleted: true,
    displayName: 'Camilo',
    residenceCountryCode: 'CL',
    ...overrides,
  };
}

function tripDoc(overrides = {}) {
  return {
    _id: TRIP_ID,
    title: 'Buenos Aires, 2026',
    destination: { cityName: 'Buenos Aires', countryName: 'Argentina', timezone: 'America/Argentina/Buenos_Aires' },
    startDateTime: '2026-07-18T09:30',
    endDateTime: '2026-07-21T22:00',
    baseStoryId: 'ba-2026',
    expectedTravelers: 2,
    members: [{ userId: OWNER_ID, role: 'owner', joinedAt: '2026-07-01T00:00:00.000Z' }],
    ...overrides,
  };
}

function collections({ invitations = [], trips, users = [] } = {}) {
  return {
    invitations: makeCollection(invitations),
    trips: makeCollection(trips ?? [tripDoc()]),
    users: makeCollection(users),
  };
}

// --- Helpers puros ---

test('normalizeInvitedEmail baja a minúsculas y recorta; rechaza inválidos con ValidationError', () => {
  assert.equal(normalizeInvitedEmail('  Pareja@Mail.COM '), 'pareja@mail.com');
  assert.throws(() => normalizeInvitedEmail('no-es-un-mail'), /correo válido/);
  assert.throws(() => normalizeInvitedEmail(''), /correo válido/);
});

test('generateInvitationToken produce tokens únicos y url-safe de alta entropía', () => {
  const a = generateInvitationToken();
  const b = generateInvitationToken();
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.ok(a.length >= 40);
});

test('hashInvitationToken es determinista, distinto por token y nunca es el token plano', () => {
  const token = generateInvitationToken();
  const hash = hashInvitationToken(token);
  assert.equal(hash, hashInvitationToken(token));
  assert.notEqual(hash, token);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, hashInvitationToken(generateInvitationToken()));
});

test('invitationExpiresAt cae ~7 días adelante', () => {
  const now = Date.parse('2026-07-10T00:00:00.000Z');
  assert.equal(invitationExpiresAt({ now }), '2026-07-17T00:00:00.000Z');
});

test('resolveInvitationStatus expira perezosamente las pending vencidas', () => {
  const now = new Date('2026-07-20T00:00:00.000Z');
  const fresh = { status: 'pending', expiresAt: '2026-07-25T00:00:00.000Z' };
  const stale = { status: 'pending', expiresAt: '2026-07-15T00:00:00.000Z' };
  assert.equal(resolveInvitationStatus(fresh, { now }), 'pending');
  assert.equal(resolveInvitationStatus(stale, { now }), 'expired');
  assert.equal(resolveInvitationStatus({ status: 'accepted' }, { now }), 'accepted');
});

test('maskEmail enmascara el local y conserva el dominio', () => {
  assert.equal(maskEmail('pareja@mail.com'), 'p•••••@mail.com');
  assert.equal(maskEmail('sinarroba'), '•••');
});

test('publicInvitationPreview sanitiza: nunca expone tokenHash, ids ni members', () => {
  const invitation = {
    _id: new ObjectId(),
    tripId: TRIP_ID,
    createdBy: OWNER_ID,
    tokenHash: 'deadbeef',
    invitedEmail: 'pareja@mail.com',
    invitedEmailNormalized: 'pareja@mail.com',
    status: 'pending',
    expiresAt: '2026-12-01T00:00:00.000Z',
  };
  const preview = publicInvitationPreview({
    invitation,
    trip: tripDoc(),
    ownerDisplayName: 'Camilo',
    now: new Date('2026-07-10T00:00:00.000Z'),
  });
  assert.equal(preview.status, 'pending');
  assert.equal(preview.requiresAuthentication, true);
  assert.equal(preview.ownerDisplayName, 'Camilo');
  assert.equal(preview.invitedEmailMasked, 'p•••••@mail.com');
  assert.deepEqual(Object.keys(preview.trip).sort(), ['destination', 'endDateTime', 'startDateTime', 'title']);
  const serialized = JSON.stringify(preview);
  assert.ok(!serialized.includes('deadbeef'));
  assert.ok(!serialized.includes(String(TRIP_ID)));
  assert.ok(!serialized.includes('members'));
});

test('assertCanManageInvitations exige email verificado y perfil completo', () => {
  assert.throws(() => assertCanManageInvitations(validOwner({ emailVerifiedAt: null })), /Verificá tu correo/);
  assert.throws(() => assertCanManageInvitations(validOwner({ displayName: null })), /nombre y país/);
  assert.doesNotThrow(() => assertCanManageInvitations(validOwner()));
});

// --- createInvitation ---

test('createInvitation crea pending como editor, devuelve inviteUrl y NO persiste el token plano', async () => {
  const cols = collections();
  const { invitation, inviteUrl, expiresAt } = await createInvitation({
    trip: tripDoc(),
    owner: validOwner(),
    email: 'Pareja@Mail.com',
    collections: cols,
    now: '2026-07-10T12:00:00.000Z',
  });

  assert.equal(invitation.status, INVITATION_STATUSES.pending);
  assert.equal(invitation.role, INVITATION_ROLE);
  assert.equal(invitation.role, 'editor');
  assert.equal(invitation.invitedEmailNormalized, 'pareja@mail.com');
  assert.match(inviteUrl, /^https:\/\/alaia\.test\/invite\/[A-Za-z0-9_-]+$/);
  assert.ok(expiresAt > '2026-07-10T12:00:00.000Z');
  // El token plano de la URL NO está en el documento; sí su hash.
  const token = inviteUrl.split('/invite/')[1];
  assert.equal(cols.invitations.docs[0].tokenHash, hashInvitationToken(token));
  assert.equal('token' in cols.invitations.docs[0], false);
});

test('createInvitation rechaza invitarse a sí mismo (409)', async () => {
  await assert.rejects(
    createInvitation({ trip: tripDoc(), owner: validOwner(), email: 'owner@alaia.test', collections: collections() }),
    /ya eres parte/,
  );
});

test('createInvitation rechaza a un email que ya es miembro (409)', async () => {
  const memberId = new ObjectId();
  const trip = tripDoc({ members: [{ userId: OWNER_ID, role: 'owner' }, { userId: memberId, role: 'editor' }], expectedTravelers: 3 });
  const cols = collections({ users: [{ _id: memberId, email: 'pareja@mail.com' }] });
  await assert.rejects(
    createInvitation({ trip, owner: validOwner(), email: 'pareja@mail.com', collections: cols }),
    /ya es parte/,
  );
});

test('createInvitation rechaza una invitación pendiente duplicada (409)', async () => {
  const existing = {
    tripId: TRIP_ID,
    invitedEmailNormalized: 'pareja@mail.com',
    status: 'pending',
    createdBy: OWNER_ID,
    createdAt: '2026-07-09T00:00:00.000Z',
    expiresAt: '2026-12-01T00:00:00.000Z',
  };
  await assert.rejects(
    createInvitation({
      trip: tripDoc(),
      owner: validOwner(),
      email: 'pareja@mail.com',
      collections: collections({ invitations: [existing] }),
      now: '2026-07-10T12:00:00.000Z',
    }),
    /invitación pendiente/,
  );
});

test('createInvitation respeta el cupo contando miembros + pendientes (409)', async () => {
  // Viaje para 2: owner (1 miembro) + 1 pendiente ya llena el cupo.
  const pending = {
    tripId: TRIP_ID,
    invitedEmailNormalized: 'otra@mail.com',
    status: 'pending',
    createdBy: OWNER_ID,
    createdAt: '2026-07-09T00:00:00.000Z',
    expiresAt: '2026-12-01T00:00:00.000Z',
  };
  await assert.rejects(
    createInvitation({
      trip: tripDoc(),
      owner: validOwner(),
      email: 'pareja@mail.com',
      collections: collections({ invitations: [pending] }),
      now: '2026-07-10T12:00:00.000Z',
    }),
    /cupo/,
  );
});

test('createInvitation NO cuenta pendientes vencidas contra el cupo (las expira y crea)', async () => {
  const stale = {
    tripId: TRIP_ID,
    invitedEmailNormalized: 'vieja@mail.com',
    status: 'pending',
    createdBy: OWNER_ID,
    createdAt: '2026-06-01T00:00:00.000Z',
    expiresAt: '2026-06-08T00:00:00.000Z', // vencida a la fecha de now
  };
  const cols = collections({ invitations: [stale] });
  const { invitation } = await createInvitation({
    trip: tripDoc(),
    owner: validOwner(),
    email: 'pareja@mail.com',
    collections: cols,
    now: '2026-07-10T12:00:00.000Z',
  });
  assert.equal(invitation.status, 'pending');
  assert.equal(cols.invitations.docs.find((d) => d.invitedEmailNormalized === 'vieja@mail.com').status, 'expired');
});

test('createInvitation aplica rate limit por owner (429)', async () => {
  const now = '2026-07-10T12:00:00.000Z';
  const many = Array.from({ length: 20 }, (_, i) => ({
    tripId: new ObjectId(),
    invitedEmailNormalized: `x${i}@mail.com`,
    status: 'accepted',
    createdBy: OWNER_ID,
    createdAt: '2026-07-10T11:30:00.000Z',
    expiresAt: '2026-12-01T00:00:00.000Z',
  }));
  await assert.rejects(
    createInvitation({ trip: tripDoc(), owner: validOwner(), email: 'pareja@mail.com', collections: collections({ invitations: many }), now }),
    /muchas invitaciones/,
  );
});

test('createInvitation exige owner verificado, perfil completo y email válido', async () => {
  await assert.rejects(
    createInvitation({ trip: tripDoc(), owner: validOwner({ emailVerifiedAt: null }), email: 'pareja@mail.com', collections: collections() }),
    /Verificá tu correo/,
  );
  await assert.rejects(
    createInvitation({ trip: tripDoc(), owner: validOwner({ displayName: null }), email: 'pareja@mail.com', collections: collections() }),
    /nombre y país/,
  );
  await assert.rejects(
    createInvitation({ trip: tripDoc(), owner: validOwner(), email: 'no-mail', collections: collections() }),
    /correo válido/,
  );
});

// --- getInvitationPreview ---

test('getInvitationPreview devuelve preview sanitizado para un token válido', async () => {
  const token = generateInvitationToken();
  const invitation = {
    tripId: TRIP_ID,
    createdBy: OWNER_ID,
    tokenHash: hashInvitationToken(token),
    invitedEmail: 'pareja@mail.com',
    invitedEmailNormalized: 'pareja@mail.com',
    status: 'pending',
    expiresAt: '2026-12-01T00:00:00.000Z',
  };
  const cols = collections({ invitations: [invitation], users: [{ _id: OWNER_ID, displayName: 'Camilo' }] });
  const preview = await getInvitationPreview({ token, collections: cols, now: new Date('2026-07-10T00:00:00.000Z') });
  assert.equal(preview.status, 'pending');
  assert.equal(preview.ownerDisplayName, 'Camilo');
  assert.equal(preview.trip.title, 'Buenos Aires, 2026');
  assert.equal('tokenHash' in preview, false);
});

test('getInvitationPreview lanza 404 con token inexistente', async () => {
  await assert.rejects(
    getInvitationPreview({ token: generateInvitationToken(), collections: collections() }),
    /No encontramos esta invitación/,
  );
});

// --- acceptInvitation ---

function seedInvitation(overrides = {}) {
  const token = generateInvitationToken();
  const invitation = {
    _id: new ObjectId(),
    tripId: TRIP_ID,
    createdBy: OWNER_ID,
    tokenHash: hashInvitationToken(token),
    invitedEmail: 'pareja@mail.com',
    invitedEmailNormalized: 'pareja@mail.com',
    role: 'editor',
    status: 'pending',
    createdAt: '2026-07-10T12:00:00.000Z',
    expiresAt: '2026-12-01T00:00:00.000Z',
    ...overrides,
  };
  return { token, invitation };
}

function invitee(overrides = {}) {
  return { _id: new ObjectId(), email: 'pareja@mail.com', emailVerifiedAt: '2026-07-05T00:00:00.000Z', ...overrides };
}

test('acceptInvitation agrega al miembro atómicamente y marca accepted', async () => {
  const { token, invitation } = seedInvitation();
  const cols = collections({ invitations: [invitation] });
  const user = invitee();
  const result = await acceptInvitation({ token, user, collections: cols, now: '2026-07-11T00:00:00.000Z' });

  assert.equal(result.tripId, String(TRIP_ID));
  const trip = cols.trips.docs[0];
  assert.equal(trip.members.length, 2);
  assert.equal(String(trip.members[1].userId), String(user._id));
  assert.equal(trip.members[1].role, 'editor');
  assert.equal(cols.invitations.docs[0].status, 'accepted');
  assert.equal(String(cols.invitations.docs[0].acceptedBy), String(user._id));
});

test('acceptInvitation rechaza si el email de sesión no coincide (403) y no agrega miembro', async () => {
  const { token, invitation } = seedInvitation();
  const cols = collections({ invitations: [invitation] });
  await assert.rejects(
    acceptInvitation({ token, user: invitee({ email: 'otra@mail.com' }), collections: cols }),
    /otro correo/,
  );
  assert.equal(cols.trips.docs[0].members.length, 1);
});

test('acceptInvitation exige email verificado (403)', async () => {
  const { token, invitation } = seedInvitation();
  await assert.rejects(
    acceptInvitation({ token, user: invitee({ emailVerifiedAt: null }), collections: collections({ invitations: [invitation] }) }),
    /Verificá tu correo/,
  );
});

test('acceptInvitation devuelve 410 si está vencida', async () => {
  const { token, invitation } = seedInvitation({ expiresAt: '2026-07-09T00:00:00.000Z' });
  await assert.rejects(
    acceptInvitation({ token, user: invitee(), collections: collections({ invitations: [invitation] }), now: '2026-07-11T00:00:00.000Z' }),
    /ya no está disponible/,
  );
});

test('acceptInvitation devuelve 410 si fue revocada o rechazada', async () => {
  for (const status of ['revoked', 'declined']) {
    const { token, invitation } = seedInvitation({ status });
    await assert.rejects(
      acceptInvitation({ token, user: invitee(), collections: collections({ invitations: [invitation] }) }),
      /ya no está disponible/,
    );
  }
});

test('acceptInvitation es idempotente si el mismo usuario ya aceptó', async () => {
  const user = invitee();
  const { token, invitation } = seedInvitation({ status: 'accepted', acceptedBy: user._id });
  const result = await acceptInvitation({ token, user, collections: collections({ invitations: [invitation] }) });
  assert.deepEqual(result, { tripId: String(TRIP_ID), alreadyAccepted: true });
});

test('acceptInvitation devuelve 410 si otro usuario ya la usó', async () => {
  const { token, invitation } = seedInvitation({ status: 'accepted', acceptedBy: new ObjectId() });
  await assert.rejects(
    acceptInvitation({ token, user: invitee(), collections: collections({ invitations: [invitation] }) }),
    /ya fue utilizada/,
  );
});

test('acceptInvitation devuelve 409 si el viaje ya está completo (cupo por carrera)', async () => {
  const { token, invitation } = seedInvitation();
  // Viaje ya lleno: expectedTravelers 2 con 2 miembros distintos al invitado.
  const fullTrip = tripDoc({
    members: [{ userId: OWNER_ID, role: 'owner' }, { userId: new ObjectId(), role: 'editor' }],
  });
  await assert.rejects(
    acceptInvitation({ token, user: invitee(), collections: collections({ invitations: [invitation], trips: [fullTrip] }) }),
    /ya está completo/,
  );
});

// --- declineInvitation ---

test('declineInvitation cierra la invitación sin agregar miembro y deja el token inutilizable', async () => {
  const { token, invitation } = seedInvitation();
  const cols = collections({ invitations: [invitation] });
  const user = invitee();
  const result = await declineInvitation({ token, user, collections: cols, now: '2026-07-11T00:00:00.000Z' });
  assert.equal(result.status, 'declined');
  assert.equal(cols.trips.docs[0].members.length, 1);
  // El token ya no sirve para aceptar.
  await assert.rejects(acceptInvitation({ token, user, collections: cols }), /ya no está disponible/);
});

test('declineInvitation es idempotente para el mismo usuario', async () => {
  const user = invitee();
  const { token, invitation } = seedInvitation({ status: 'declined', declinedBy: user._id });
  const result = await declineInvitation({ token, user, collections: collections({ invitations: [invitation] }) });
  assert.equal(result.status, 'declined');
});

test('declineInvitation rechaza email que no coincide (403)', async () => {
  const { token, invitation } = seedInvitation();
  await assert.rejects(
    declineInvitation({ token, user: invitee({ email: 'otra@mail.com' }), collections: collections({ invitations: [invitation] }) }),
    /otro correo/,
  );
});

// --- revokeInvitation ---

test('revokeInvitation marca revoked solo sobre pending', async () => {
  const { invitation } = seedInvitation();
  const cols = collections({ invitations: [invitation] });
  const result = await revokeInvitation({
    tripId: TRIP_ID,
    invitationId: invitation._id,
    owner: validOwner(),
    collections: cols,
    now: '2026-07-11T00:00:00.000Z',
  });
  assert.equal(result.status, 'revoked');
  assert.equal(cols.invitations.docs[0].status, 'revoked');
});

test('revokeInvitation devuelve 409 si no está pending', async () => {
  const { invitation } = seedInvitation({ status: 'accepted' });
  await assert.rejects(
    revokeInvitation({ tripId: TRIP_ID, invitationId: invitation._id, owner: validOwner(), collections: collections({ invitations: [invitation] }) }),
    /pendientes/,
  );
});

test('revokeInvitation devuelve 404 si la invitación no existe', async () => {
  await assert.rejects(
    revokeInvitation({ tripId: TRIP_ID, invitationId: new ObjectId(), owner: validOwner(), collections: collections() }),
    /No encontramos/,
  );
});

// --- listPendingInvitations ---

test('listPendingInvitations devuelve solo pendientes, enmascaradas y sin tokenHash', async () => {
  const { invitation: pending } = seedInvitation();
  const { invitation: accepted } = seedInvitation({ status: 'accepted', invitedEmail: 'ya@mail.com', invitedEmailNormalized: 'ya@mail.com' });
  const cols = collections({ invitations: [pending, accepted] });
  const list = await listPendingInvitations({ tripId: TRIP_ID, collections: cols, now: '2026-07-11T00:00:00.000Z' });
  assert.equal(list.length, 1);
  assert.equal(list[0].invitedEmailMasked, 'p•••••@mail.com');
  assert.equal('tokenHash' in list[0], false);
});

test('listPendingInvitations expira perezosamente las vencidas antes de listar', async () => {
  const { invitation: stale } = seedInvitation({ expiresAt: '2026-07-09T00:00:00.000Z' });
  const cols = collections({ invitations: [stale] });
  const list = await listPendingInvitations({ tripId: TRIP_ID, collections: cols, now: '2026-07-11T00:00:00.000Z' });
  assert.equal(list.length, 0);
  assert.equal(cols.invitations.docs[0].status, 'expired');
});
