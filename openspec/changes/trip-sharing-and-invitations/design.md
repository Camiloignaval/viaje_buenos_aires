# Design: Viaje compartido e invitaciones (Alaia Together)

## 1. Arquitectura actual relevante (diagnóstico)

| Pieza | Dónde | Estado hoy |
|-------|-------|------------|
| Trip model | `app/lib/platformTrips.js` | `ownerId: ObjectId`, `members:[{userId:ObjectId, role, joinedAt}]` (solo `owner`), `expectedTravelers` int 1–50, `baseStoryId` (`ba-2026` para BA), `destination.timezone`, `status` active/archived |
| Autorización | `app/lib/platformAuth.js` | `requireUser`, `requireTripMember`, `requireTripRole(allowedRoles)` — lanzan `AuthError` con `statusCode` |
| Trips API | `app/api/trips.js`, `app/api/trips/[tripId].js` | listado `{'members.userId': uid}`; GET vía `requireTripMember`; PATCH vía `requireTripRole(['owner'])` |
| Login | `app/api/auth/{request-code,verify-code,session,logout}.js` | passwordless; cookie `alaia_session` JWT propio; `emailVerifiedAt` se setea en cada verify |
| Errores | `app/lib/platformErrors.js` | `PlatformError`+subclases (401/403 email/422/400/429/502/503) + `sendPlatformError`. **Faltan 404/409/410/403-forbidden** |
| Mongo | `app/lib/platformMongo.js` | `getPlatformDb`, `PLATFORM_COLLECTIONS`, getters, `toObjectId`; índices **lazy** en punto de uso |
| Config | `app/lib/platformConfig.js` | `config.app.baseUrl` ← `APP_BASE_URL`; secretos `ALAIA_*` |
| Email/Notif | `app/lib/email/*`, `app/lib/notifications/notificationService.js` | `sendEmail` + senders/templates; entrega idempotente |
| Router FE | `app/src/app/router.tsx` | v7 lazy; `/`,`/login`,`/onboarding`,`/trips`,`/trips/:tripId`,`/experience`; guards `RequireAuth`, `RequireOnboarding` |
| Sesión FE | `app/src/features/auth/hooks/useSession.ts` | TanStack Query; `{status, user:{email,displayName}}`. **Sin `returnTo`** |

## 2. Arquitectura objetivo

Aditiva. Una colección nueva (`tripInvitations`), una capa de lib nueva
(`platformInvitations.js`) que reusa Mongo/errores/auth, cinco endpoints, una ruta de
frontend pública (`/invite/:token`) y un feature de frontend nuevo (`features/sharing`).
El resto se reutiliza tal cual.

```
                 owner (sesión)                         invitado
                      │                                    │
      POST /api/trips/:tripId/invitations                  │
                      │  crea invitación (tokenHash)        │
                      ▼                                     │
              { inviteUrl, expiresAt } ──► WhatsApp/copiar ►│  abre /invite/:token
                                                            ▼
                                        GET /api/invitations/:token  (preview sanitizado)
                                                            │
                                        ┌───────────────────┴───────────────────┐
                                   sin sesión                              con sesión
                                        │                                       │
                        /login?returnTo=/invite/:token          email == invitedEmail?
                        (email→code, returnTo en URL)             ┌────────┴─────────┐
                                        │                        sí                  no
                              vuelve a /invite/:token       Aceptar/Rechazar   "enviada a otro correo"
                              (NO auto-acepta)                    │             (cerrar sesión / mis viajes)
                                                                  ▼
                              POST /api/invitations/:token/accept  (o /decline)
                                                                  │  member atómico + status=accepted
                                                                  ▼
                                        navega a /trips/:tripId (Portada) ──► Experience
```

## 3. Modelo `tripInvitation`

Colección **`tripInvitations`** (agregar a `PLATFORM_COLLECTIONS` + getter
`getTripInvitationsCollection`).

```js
{
  _id: ObjectId,
  tripId: ObjectId,                 // ref trips._id
  invitedEmail: string,             // como lo tipeó el owner (display)
  invitedEmailNormalized: string,   // normalizeEmail() — clave de matching/authz
  tokenHash: string,                // HMAC-SHA256(token) — NUNCA el token plano
  role: 'editor',                   // único rol invitable en esta etapa
  status: 'pending'|'accepted'|'declined'|'revoked'|'expired',
  createdBy: ObjectId,              // owner (userId)
  createdAt: string,                // ISO
  expiresAt: string,                // ISO (createdAt + INVITATION_TTL_DAYS)
  updatedAt: string,                // ISO
  acceptedBy?: ObjectId, acceptedAt?: string,
  declinedBy?: ObjectId, declinedAt?: string,
  revokedBy?: ObjectId,  revokedAt?: string
}
```

**Token**: `crypto.randomBytes(32).toString('base64url')` (256 bits de entropía).
Se devuelve **solo** al crear, dentro de `inviteUrl`. Persistimos únicamente
`tokenHash = HMAC-SHA256(token, ALAIA_AUTH_CODE_SECRET || ALAIA_JWT_SECRET)`.
Lookup por `tokenHash` (indexado); no hace falta comparación constant-time porque es
una búsqueda por igualdad indexada, no una verificación de secreto en memoria.

**Expiración lazy**: en toda lectura, si `status === 'pending' && expiresAt < now`, se
trata como `expired` (y se puede persistir el cambio de estado de forma perezosa,
best-effort). Sin cron ni Redis.

## 4. Índices Mongo (idempotentes, lazy — patrón `notificationService.js`)

En `platformInvitations.js`, un `ensureInvitationIndexes(col)` llamado en el primer uso:

- `{ tokenHash: 1 }` **unique** — lookup y unicidad del token.
- `{ tripId: 1, invitedEmailNormalized: 1, status: 1 }` **partial** `{ status: 'pending' }`
  **unique** — impide **duplicar invitación pendiente** para el mismo email+viaje.
- `{ tripId: 1 }` — listar por viaje.
- `{ createdBy: 1, createdAt: -1 }` — rate limiting por owner.
- `{ expiresAt: 1 }` — barrido/consulta de expiración.

Además, índices de soporte (idempotentes) sobre colecciones existentes:
- `users`: `{ email: 1 }` unique (hoy no existe; el bootstrap y el matching lo necesitan).
- `trips`: `{ bootstrapKey: 1 }` unique **sparse** (para el bootstrap idempotente).

Se crean con `createIndex` idempotente; documentado en el script de bootstrap y en el
lib de invitaciones. **No** se introduce un job ni Redis.

## 5. Contrato de membership y roles

Reutiliza `members: [{ userId, role, joinedAt }]`. Enum explícito nuevo en
`platformTrips.js`: `TRIP_ROLES = { owner: 'owner', editor: 'editor' }`.

| Acción | owner | editor |
|--------|:---:|:---:|
| Listar el trip / abrir Portada / abrir Experience / leer contenido conectado | ✅ | ✅ |
| Crear invitación / revocar | ✅ | ❌ |
| Cambiar owner / eliminar trip / editar `expectedTravelers` | ✅ | ❌ |
| Editar contenido | ✅ (como hoy) | ❌ (MVP: sin pantallas nuevas) |

`editor` en este MVP = **miembro colaborador de solo lectura**. Autorización:
- Lectura de trip: `requireTripMember` (ya incluye owner+editor).
- Acciones de invitación: `requireTripRole(tripId, ['owner'])`.

**Alta atómica** (evita carrera y duplicado en una sola operación):

```js
const res = await trips.updateOne(
  {
    _id: tripObjectId,
    'members.userId': { $ne: userObjectId },                 // no duplicar
    $expr: { $lt: [ { $size: '$members' }, '$expectedTravelers' ] }  // cupo atómico
  },
  { $push: { members: { userId: userObjectId, role: 'editor', joinedAt: now } },
    $set: { updatedAt: now } }
);
// matchedCount === 1 → alta OK
// matchedCount === 0 → o ya es miembro (idempotente: verificar y devolver tripId)
//                      o cupo lleno (409 ConflictError)
```

## 6. Política de `expectedTravelers` (cupo)

- `expectedTravelers` es el **total esperado incluido el owner** (int 1–50, exacto).
- **Cupo = `expectedTravelers`**; ocupación = `members.length`.
- **Al crear invitación**: exigir `members.length + pendientesNoVencidas < expectedTravelers`
  (no sobre-invitar). [Ver D2]
- **Al aceptar**: guard atómico `members.length < expectedTravelers` (arriba). Los estados
  `expired|revoked|declined` **no** reservan cupo. La expiración lazy libera cupo sin cron.

## 7. Endpoints exactos

Handlers finos en `app/api/*`; lógica en `app/lib/platformInvitations.js`. Todos envueltos
en `try { … } catch (e) { return sendPlatformError(res, e) }`.

### 7.1 `POST /api/trips/[tripId]/invitations` — crear (owner)
Archivo: `app/api/trips/[tripId]/invitations.js` (también expone GET, ver 7.6).
- `requireTripRole(tripId, ['owner'])`; owner con `emailVerifiedAt`; perfil completo (422 si no).
- Body `{ email }` — normalización **server-side**; 400 si inválido.
- Rechazos: invitar al owner (409), a un miembro existente (409), duplicar `pending` (409),
  cupo lleno considerando pendientes (409). No revela si el email existe como usuario Alaia.
- Genera token (256 bits), persiste solo `tokenHash`, `role:'editor'`, `expiresAt`.
- `inviteUrl = ${config.app.baseUrl}/invite/${token}`.
- **201** `{ invitationId, inviteUrl, expiresAt }`. El `inviteUrl` se devuelve **solo aquí**.

### 7.2 `GET /api/invitations/[token]` — preview público (sanitizado)
Archivo: `app/api/invitations/[token].js`. Sin sesión requerida.
Devuelve **solo**: `{ status, trip:{ title, destination:{cityName,countryName}, startDateTime,
endDateTime }, ownerDisplayName, invitedEmailMasked?, requiresAuthentication }` y, si aplica,
`expired|revoked|accepted|declined`.
**Nunca**: miembros, emails completos de terceros, `ownerId`, `userId`s, `tokenHash`, datos
privados del trip. Token inexistente → 404.

### 7.3 `POST /api/invitations/[token]/accept`
Archivo: `app/api/invitations/[token]/accept.js`.
- `requireUser` (401 sin sesión); `emailVerifiedAt` presente.
- Resuelve invitación por `tokenHash`; 404 si no existe.
- Estado: `pending` (410 si expired/revoked/declined; idempotente si `accepted` por el mismo user).
- Expiración lazy (410 si vencida).
- **Email de sesión === `invitedEmailNormalized`** (403 si no coincide).
- Trip sigue existiendo (404 si no).
- Alta **atómica** (§5) con guard de cupo (409 si lleno por carrera).
- Invitación → `accepted` + `acceptedBy/acceptedAt`. **Idempotente**: si el user ya es miembro,
  responde OK igual.
- **200** `{ tripId }`. El frontend navega a `/trips/:tripId` (Portada), **no** directo a Experience.

### 7.4 `POST /api/invitations/[token]/decline`
Archivo: `app/api/invitations/[token]/decline.js`.
- `requireUser`; email de sesión === invitedEmail (403 si no).
- Estado `pending` → `declined` + `declinedBy/declinedAt`. No agrega member.
- Token queda inutilizable (no vuelve a `pending`). **Idempotente** para el mismo user.
- **200** `{ status:'declined' }`.

### 7.5 `POST /api/trips/[tripId]/invitations/[invitationId]/revoke` — owner
Archivo: `app/api/trips/[tripId]/invitations/[invitationId]/revoke.js`.
- `requireTripRole(tripId, ['owner'])`. Solo sobre `pending`.
- → `revoked` + `revokedBy/revokedAt`. Invalida aceptación futura. No borra el registro.
- 409 si el estado no es `pending`. **200** `{ status:'revoked' }`.

### 7.6 `GET /api/trips/[tripId]/invitations` — listar (owner)
Mismo archivo que 7.1. `requireTripRole(tripId, ['owner'])`. Devuelve pendientes
sanitizadas para la Portada: `[{ invitationId, invitedEmailMasked, status, createdAt,
expiresAt }]`. Sin `tokenHash` ni token.

### Tabla de status HTTP
`400` payload inválido · `401` sin sesión · `403` email incorrecto / no owner ·
`404` invitación o viaje inexistente · `409` conflicto/cupo/duplicado ·
`410` expirada/revocada/rechazada · `422` perfil incompleto · `429` rate limit.

## 8. Bootstrap de Buenos Aires (§1 del pedido)

Script administrativo **manual**, no endpoint público:
`node scripts/bootstrapBuenosAiresTrip.js --email="mi-email"` (ejecutado desde `app/`).
Archivo: `app/scripts/bootstrapBuenosAiresTrip.js`.

1. Carga `ConfigService`/env vía `getPlatformConfig` + conexión Mongo existente (`getPlatformDb`).
2. `normalizeEmail(email)`.
3. Busca el usuario real por email; **falla claro** si no existe (no lo crea).
4. Busca el trip por **clave estable** `bootstrapKey: "buenos-aires-2026"` (NUNCA dedup por título).
5. Crea o normaliza: `ownerId`, `members:[{userId, role:'owner', joinedAt}]`, `baseStoryId:'ba-2026'`,
   `destination` Buenos Aires + `timezone`, fechas existentes (si el trip ya existía, se respetan),
   `expectedTravelers`.
6. **Idempotente**: `updateOne({ bootstrapKey }, { $setOnInsert:{...}, $set:{ ownerId, updatedAt } },
   { upsert:true })` — segundo run no duplica ni pisa datos del viaje.
7. No imprime secretos (ni URI, ni token). Log de resultado con `tripId` enmascarado si aplica.

Requiere el índice `trips.bootstrapKey` unique sparse (§4).

## 9. Flujo de retorno post-login (`returnTo`) — el gap principal

Como **no existe** hoy, se construye mínimo y seguro:

- **`safeReturnTo(raw)`** (`features/sharing/lib/safeReturnTo.ts`): acepta **solo** rutas
  internas — empieza con `/`, no con `//`, sin `:` de esquema, y matchea allowlist de
  prefijos (`/invite/`, `/trips`, `/experience`). Default fallback `/trips`. Bloquea open redirect.
- **`/invite/:token` sin sesión**: no muestra acción de aceptar; muestra
  *"Antes de aceptar, inicia sesión con el correo al que llegó esta invitación."* +
  CTA *"Iniciar sesión para continuar →"* a `/login?returnTo=/invite/:token`.
- **`LoginPage`**: lee `?returnTo` con `useSearchParams`, lo valida con `safeReturnTo`, y tras
  `verifyCode` navega ahí (en vez de `/trips`). El `returnTo` vive en la **URL** durante los
  dos pasos (email→code) → no se pierde al cambiar de step.
- **NO auto-acepta**: al volver, `/invite/:token` muestra la pantalla de decisión (Aceptar/Rechazar).
- **RequireAuth**: al redirigir a `/login`, adjunta `?returnTo=<location.pathname+search>` para
  cualquier ruta protegida (mejora transversal pequeña).

## 10. Flujo sin sesión / con sesión (UX)

**Sin sesión** → preview → *"Te invitaron a compartir una historia"* / *"{owner} quiere
compartir {trip} contigo"* → *"Iniciar sesión para continuar →"* → login (returnTo) → vuelve
a decisión.

**Con sesión, email coincide** → *"¿Querés formar parte de esta historia?"* →
**Aceptar invitación →** / **Rechazar**.

**Con sesión, email NO coincide** → estado honesto *"Esta invitación fue enviada a otro
correo."* (sin revelar el correo completo) → **Cerrar sesión** / **Iniciar con el correo
correcto** / **Volver a Mis viajes**. No permite aceptar con otro email.

## 11. WhatsApp / compartir (§4)

`features/sharing/lib/whatsappUrl.ts`: `https://wa.me/?text=${encodeURIComponent(text)}` con el
copy sugerido incluyendo `inviteUrl` (devuelto por backend). Botones: **Compartir por WhatsApp**
y **Copiar enlace** (`navigator.clipboard.writeText`). Sin API oficial, sin acceso a contactos.

## 12. Seguridad (§15)

Token 256 bits · `tokenHash` HMAC persistido · lookup indexado por hash · expiración lazy ·
rate limiting por `createdBy` (patrón Mongo-count de feedback) · validación de payload ·
normalización server-side de emails · **nunca** `userId`/`invitedEmail`-verificado desde el
frontend · authz owner vía `requireTripRole` · alta atómica (`$expr` cupo + `$ne`) ·
guard de estado `pending` contra doble aceptación · respuestas sanitizadas · `returnTo`
allowlisted · logs sin token plano y con email enmascarado.

**Errores tipados nuevos** en `platformErrors.js` (con su `statusCode`):
`NotFoundError(404)`, `ConflictError(409)`, `GoneError(410)`, `ForbiddenError(403)` +
`ERROR_CODES.NOT_FOUND/CONFLICT/GONE` (`FORBIDDEN` ya existe como code).

## 13. Estados de error y UX (§16)

Cada estado con copy propio y acciones, sin errores técnicos visibles: token inválido (404),
expirada/revocada/rechazada (410 → "esta invitación ya no está disponible"), ya aceptada
(mostrar acceso al trip), email de sesión incorrecto (403), ya sos miembro (llevar al trip),
viaje eliminado (404), cupo lleno (409 → "este viaje ya está completo"), backend no disponible
(reintentar), acceso directo por URL, regreso tras login, abrir en otro dispositivo (el token
funciona igual; requiere iniciar sesión con el correo correcto).

## 14. Archivos exactos a CREAR

**Backend**
- `app/lib/platformInvitations.js` (+ `app/lib/platformInvitations.test.js`) — modelo, token/hash,
  índices lazy, createInvitation, getInvitationByToken (con expiración lazy), acceptInvitation
  (alta atómica), declineInvitation, revokeInvitation, listPendingInvitations, rate limit.
- `app/scripts/bootstrapBuenosAiresTrip.js`.
- API (handlers finos):
  - `app/api/trips/[tripId]/invitations.js` (GET listar + POST crear)
  - `app/api/trips/[tripId]/invitations/[invitationId]/revoke.js`
  - `app/api/invitations/[token].js` (GET preview)
  - `app/api/invitations/[token]/accept.js`
  - `app/api/invitations/[token]/decline.js`

**Frontend** (`app/src/features/sharing/`)
- `pages/InvitePage.tsx` (+ `.test.tsx`)
- `components/{InviteDecision,InviteWrongEmail,InviteStatusScreen,CreateInvitationDialog,ShareInvitation,TripInvitePanel}.tsx` (+ tests clave)
- `hooks/{useInvitationPreview,useCreateInvitation,useAcceptInvitation,useDeclineInvitation,useRevokeInvitation,useTripInvitations}.ts` (+ tests clave)
- `api/invitationsApi.ts` (+ `.test.ts`)
- `lib/whatsappUrl.ts` (+ `.test.ts`), `lib/safeReturnTo.ts` (+ `.test.ts`)
- `copy.ts`, `types.ts`

**E2E** (según D3)
- `app/e2e/invitations.spec.ts` (o cobertura equivalente por vitest/integración).

## 15. Archivos exactos a MODIFICAR

- `app/lib/platformErrors.js` — subclases 404/409/410/403 + `ERROR_CODES`.
- `app/lib/platformMongo.js` — `tripInvitations` en `PLATFORM_COLLECTIONS` + `getTripInvitationsCollection`.
- `app/lib/platformTrips.js` — `TRIP_ROLES` enum, soporte `bootstrapKey`, helper de alta atómica
  y de cupo (o exponer lo mínimo para que `platformInvitations` lo use).
- `app/src/app/router.tsx` — ruta pública `/invite/:token` → `InvitePage` (lazy).
- `app/src/features/auth/pages/LoginPage.tsx` + `hooks/useLoginFlow.ts` — honrar `returnTo` validado.
- `app/src/features/auth/components/RequireAuth.tsx` — adjuntar `?returnTo=` al redirigir a login.
- `app/src/features/trips/pages/TripHomePage.tsx` — montar `TripInvitePanel` (owner) / indicador (editor).
- `app/src/features/trips/api/tripsApi.ts` (o `sharing/api`) — según dónde vivan las llamadas.

## 16. Estrategia idempotente y de datos (§17)

- **Sin migración** de Trips salvo el bootstrap (upsert por `bootstrapKey`, no destructivo).
- **Índices** vía `createIndex` idempotente en el punto de uso (invitaciones) y en el script
  (users.email, trips.bootstrapKey). Reejecutar es seguro.
- **Expiración** perezosa por consulta (sin jobs).

## 17. Pruebas (§18)

- **Backend (`node --test lib/**`)** en `platformInvitations.test.js` y ampliaciones a
  `platformTrips.test.js`/`platformErrors.test.js`: bootstrap (usuario inexistente, creación,
  update, 2º run idempotente, owner, `ba-2026`, no duplicar); creación (sin sesión, perfil
  incompleto, no verificado, no owner, email inválido, owner mismo email, miembro existente,
  pendiente duplicada, cupo, tokenHash, URL, rate limit); consulta (válido/inválido/expirada/
  revocada/sanitización); aceptación (sin sesión, email incorrecto, correcta, atómica,
  idempotente, no duplica, cupo por carrera); rechazo (correcto, idempotente, token inutilizable);
  revocación (solo owner, pending, no sobre accepted/declined).
- **Frontend (`test:react`)**: owner ve CTA / editor no; no autenticado → login; `returnTo` se
  conserva; login vuelve a invitación; no auto-acepta; Aceptar/Rechazar; email incorrecto;
  WhatsApp URL; copiar enlace; navegación final a `/trips/:tripId`; `safeReturnTo` (open redirect).
- **Playwright** (D3): owner crea enlace → invitado sin sesión → login → regreso → aceptar →
  ambos ven el mismo Trip (o cobertura equivalente si no hay backend de test).

## 18. Orden de implementación por fases (§19)

1. **Infra backend**: errores 404/409/410/403; `platformMongo` colección+getter; `TRIP_ROLES`
   + helper de alta atómica/cupo en `platformTrips`. (+tests)
2. **Lib invitaciones**: `platformInvitations.js` (token/hash, índices lazy, CRUD de invitación,
   expiración lazy, rate limit, cupo). (+tests exhaustivos)
3. **Bootstrap**: `scripts/bootstrapBuenosAiresTrip.js`. (+test de la función pura subyacente)
4. **Endpoints**: crear, preview, accept, decline, revoke, listar. (+tests de lib que cubren cada rama)
5. **FE auth-return**: `safeReturnTo`, `LoginPage`/`useLoginFlow`, `RequireAuth`. (+tests)
6. **FE invite page**: `/invite/:token`, estados, decisión. (+tests)
7. **FE portada**: `TripInvitePanel`, crear/compartir/copiar, miembros/pendientes. (+tests)
8. **e2e** (D3) + validación completa.

## 19. Riesgos y mitigación

| Riesgo | Mitigación |
|--------|-----------|
| Carrera en aceptación / doble alta | update condicional atómico (`$expr` cupo + `$ne`) |
| Open redirect (`returnTo`) | `safeReturnTo` allowlist + validación estricta |
| Fuga de datos en preview | respuesta sanitizada, sin ids/miembros/emails de terceros |
| Cupo reservado por vencidas | expiración lazy; expired/revoked/declined no cuentan |
| `users.email` sin índice único | crear índice unique idempotente (bootstrap/lib) |
| Enumeración de emails Alaia | crear no revela si el email existe como usuario |
| e2e sin backend real | D3: cobertura por lib+integración; Playwright full-stack diferible |

## 20. Criterios de aceptación (§21)

- Owner puede crear invitación por email y obtener `inviteUrl`; el token plano no se persiste.
- Invitado sin sesión ve el preview, va a login y **regresa** a la invitación sin auto-aceptar.
- Solo puede aceptar si el email autenticado coincide; al aceptar entra a `members` **una sola vez**,
  llega a la Portada y puede abrir la Experience.
- Rechazar/revocar dejan el token inutilizable; un tercero por encima del cupo queda bloqueado (409).
- Preview jamás expone datos privados; `returnTo` no permite open redirect.
- `npm run typecheck && npm test && npm run test:react && npm run build` en verde (e2e según D3).

## 21. Rollback (§22)

Feature aditiva: revertir el código y (opcional) dropear `tripInvitations` restaura el estado
previo. Trips/Users no se alteran (salvo `members` de quien ya aceptó, reversible manualmente).
El bootstrap es idempotente y no destructivo.

## 22. Comandos de validación (§23)

```
cd app
npm run typecheck
npm test              # backend node --test (lib/**, src/**)
npm run test:react    # vitest
npm run build         # vite
npm run test:e2e      # playwright (según D3)
node scripts/bootstrapBuenosAiresTrip.js --email="<owner-email>"   # manual, idempotente
```

## 23. Decisiones abiertas reales (§24)

Ver *proposal.md → Decisiones abiertas*: **D1** onboarding del invitado, **D2** cupo vs.
pendientes, **D3** e2e con backend real. Cada una con recomendación. Resolverlas antes de apply.
