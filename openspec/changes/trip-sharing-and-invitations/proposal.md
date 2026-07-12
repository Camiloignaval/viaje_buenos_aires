# Proposal: Viaje compartido e invitaciones (trip-sharing-and-invitations)

## Intención

Habilitar **Alaia Together** (Etapa 6): que el viaje real de Buenos Aires quede
asociado en Mongo al usuario owner, y que ese owner pueda **invitar a su pareja**
mediante un enlace seguro compartido por **WhatsApp**. La identidad y la autorización
se resuelven con la **cuenta Alaia y el correo verificado** — nunca con datos que
elija el frontend.

El producto no debe sentirse como "compartir un documento", sino como **invitar a
alguien a vivir una historia juntos**: cálido, claro y emocional, pero seguro. Nadie
se agrega automáticamente por abrir un enlace; **aceptar es voluntario y explícito**.

## Contexto (arquitectura actual reutilizada — no se crea nada paralelo)

Verificado por diagnóstico del repo:

- **Trip** (`app/lib/platformTrips.js`) ya tiene `ownerId: ObjectId` y
  `members: [{ userId: ObjectId, role, joinedAt }]`. Hoy el único rol emitido es
  `'owner'`. `expectedTravelers` es un entero `1..50` (total esperado, incluye owner),
  **desacoplado** de `members`. `baseStoryId` de Buenos Aires = `ba-2026`.
- **Autorización por viaje** ya existe: `requireUser`, `requireTripMember`,
  `requireTripRole(allowedRoles)` en `app/lib/platformAuth.js`. Listado filtra por
  `{'members.userId': userObjectId}`; el PATCH de trip usa `requireTripRole(['owner'])`.
- **Login passwordless** (`app/api/auth/*`): request-code → verify-code → cookie
  `alaia_session` (JWT propio, HttpOnly, 30d). `emailVerifiedAt` se setea SIEMPRE al
  verificar el código (todo login verifica el email de facto).
- **Errores tipados** (`app/lib/platformErrors.js`): `PlatformError` + subclases con
  `statusCode` y `sendPlatformError(res, err)`. Hoy NO existen subclases 404/409/410/403.
- **Mongo** (`app/lib/platformMongo.js`): `getPlatformDb()`, `PLATFORM_COLLECTIONS`,
  getters por colección, `toObjectId`. Los índices se crean **lazy** en el punto de uso
  (patrón `notificationService.js`). No hay colección de invitaciones.
- **Email/Notificaciones**: primitiva `sendEmail` + patrón sender/template y
  `NotificationService` idempotente. `APP_BASE_URL` → `config.app.baseUrl` para armar links.
- **Frontend**: react-router v7 lazy; rutas `/`, `/login`, `/onboarding`, `/trips`,
  `/trips/:tripId`, `/experience`. Sesión vía TanStack Query (`useSession()`). **NO existe
  mecanismo `returnTo`/redirect-post-login** — es el principal gap a construir.

## Alcance (in-scope)

- **Bootstrap idempotente** de Buenos Aires 2026 al usuario owner (script administrativo,
  no endpoint público), con `bootstrapKey` estable.
- Colección **`tripInvitations`** ligada a email, con `tokenHash` (nunca token plano),
  estados `pending|accepted|declined|revoked|expired` y rol `editor`.
- Endpoints: **crear**, **preview público**, **aceptar**, **rechazar**, **revocar**,
  **listar pendientes** (owner).
- **Compartir por WhatsApp** (`wa.me`, solo transporta el enlace) + **copiar enlace**.
- **Flujo de retorno post-login** (`returnTo` validado, sin open redirect) para invitados
  sin sesión.
- **Membership atómica** con guard de cupo (`expectedTravelers`), protección de doble
  aceptación y de carrera.
- **UI mínima** en la Portada del viaje: CTA de invitar (solo owner), miembros e
  invitaciones pendientes, estados de la vista `/invite/:token`.
- **Infra transversal mínima**: subclases de error `NotFoundError(404)`,
  `ConflictError(409)`, `GoneError(410)`, `ForbiddenError(403)`; rate limiting de
  invitaciones (mismo patrón Mongo-count que feedback).

## Fuera de alcance (no-goals)

Chat, comentarios, reacciones, presencia, cursores, edición colaborativa en tiempo real,
notificaciones push, SMS, API oficial de WhatsApp, contactos del teléfono, roles avanzados
o permisos configurables, Timeline Engine, Story Engine dinámico, IA/generación de
contenido, álbum colaborativo, feed social. **No** se cambia el comportamiento ni la
arquitectura de la Etapa 5. **No** se migran Trips existentes salvo el bootstrap.
**No** se envía email automático de invitación en este MVP (WhatsApp es el canal;
la arquitectura lo deja listo para agregarlo después vía `NotificationService`).

## Capacidades (specs entregadas)

- `trip-bootstrap` — asociación idempotente de Buenos Aires al owner.
- `trip-invitations` — modelo, creación, preview, aceptar/rechazar/revocar, expiración, seguridad.
- `invitation-auth-return` — login con retorno seguro a la invitación (`returnTo`).
- `trip-membership` — alta atómica de miembro, roles owner/editor, cupo `expectedTravelers`.
- `invitation-sharing-ui` — Portada (owner), vista `/invite/:token`, WhatsApp/copiar.

## Riesgos (resumen; detalle en design.md)

- **Carrera en aceptación / doble alta** → mitigado con update condicional atómico
  (`$expr` de cupo + `members.userId $ne`) y estado `pending` como guard.
- **Open redirect en `returnTo`** → allowlist de rutas internas + validación estricta.
- **Fuga de datos en el preview público** → respuesta sanitizada (sin miembros, sin
  emails de terceros, sin ids, sin tokenHash).
- **Reserva de cupo por invitaciones vencidas** → expiración lazy; los estados
  expired/revoked/declined no cuentan.
- **e2e con backend real**: hoy Playwright no levanta API/Mongo/login. Ver *Decisiones abiertas*.

## Rollback

Feature aditiva: nueva colección `tripInvitations`, nuevas rutas y una nueva ruta de
frontend. Revertir el código deshabilita el flujo sin afectar Trips/Users existentes.
El bootstrap es idempotente y no destructivo. Detalle por pieza en design.md.

## Decisiones (CERRADAS — preferencias del usuario)

1. **Canal**: WhatsApp vía `wa.me`, sin API oficial ni contactos. ✅
2. **Rol invitado**: `editor` = **miembro colaborador de solo lectura** en este MVP
   (lista trip, abre Portada y Experience, lee contenido conectado). Sin pantallas de
   edición ni endpoints de mutación nuevos para editor. ✅
3. **Email de invitación**: no se implementa envío automático ahora; arquitectura lista
   para `NotificationService`. La invitación no se bloquea si Resend no está disponible. ✅
4. **`tokenHash`**: HMAC-SHA256 con el secreto existente (`ALAIA_AUTH_CODE_SECRET ||
   ALAIA_JWT_SECRET`) — sin nueva env var (el usuario administra Vercel). ✅
5. **Expiración**: TTL por constante (`INVITATION_TTL_DAYS = 7`), expiración **lazy** en
   consulta. Sin cron/Redis. ✅

## Decisiones antes abiertas (CERRADAS — aprobadas por el usuario)

- **D1 — Onboarding del invitado nuevo**: ✅ **Diferir**. `/invite/:token` y `accept` **NO**
  exigen onboarding. El usuario inicia sesión, vuelve a la invitación, acepta/rechaza y queda
  como miembro. Si luego entra al viaje con perfil incompleto, el **guard actual** completa
  nombre y país. No se pierde la invitación ni se repite la aceptación.
- **D2 — Cupo vs. invitaciones pendientes**: ✅ Al **crear** se cuenta
  `members + pendientes no vencidas < expectedTravelers`. Al **aceptar** el guard **atómico**
  valida solo `members < expectedTravelers` (no confía en el frontend). Expiradas/revocadas/
  rechazadas **no** reservan cupo.
- **D3 — e2e**: ✅ Sin harness full-stack artificial ahora. Se implementan tests unitarios
  backend, integración de libs/endpoints, vitest frontend y Playwright de UI **sin Mongo real**.
  El e2e real con Mongo/Vercel se valida **manualmente** después con dos usuarios reales.

Plan aprobado. Ejecución autónoma de todas las fases.
