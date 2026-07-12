# Trip Invitations Specification

## Purpose

Definir el modelo, ciclo de vida y seguridad de las invitaciones ligadas a email: crear,
consultar (preview público sanitizado), aceptar, rechazar, revocar y expirar — sin exponer
el token plano ni datos privados.

## Requirements

### Requirement: Invitation Model and Token Safety

Una invitación MUST persistir solo el `tokenHash` (nunca el token plano), con estados
`pending|accepted|declined|revoked|expired` y rol `editor`.

#### Scenario: El token plano no se persiste

- GIVEN una invitación creada
- WHEN se inspecciona el documento en `tripInvitations`
- THEN MUST contener `tokenHash`
- AND MUST NOT contener el token plano

#### Scenario: Índices que impiden duplicados pendientes

- GIVEN una invitación `pending` para un email+viaje
- WHEN se intenta crear otra `pending` para el mismo email+viaje
- THEN MUST rechazarse (409) por índice único parcial

### Requirement: Create Invitation (Owner Only)

Crear una invitación MUST exigir sesión, email verificado, perfil completo y rol owner,
con normalización server-side y sin filtrar existencia de usuarios.

#### Scenario: Solo el owner crea

- GIVEN un usuario con rol `editor` o sin acceso al viaje
- WHEN hace `POST /api/trips/:tripId/invitations`
- THEN MUST responder 403

#### Scenario: Rechazos de negocio

- GIVEN un owner autenticado
- WHEN invita al propio owner, a un miembro existente, o duplica una `pending`, o excede el cupo
- THEN MUST responder 409

#### Scenario: Respuesta de creación

- GIVEN una creación válida
- WHEN responde
- THEN MUST devolver `{ invitationId, inviteUrl, expiresAt }` con `inviteUrl` basada en `APP_BASE_URL`
- AND el `inviteUrl` MUST devolverse solo en esta respuesta
- AND MUST NOT revelar si el email pertenece a un usuario Alaia

### Requirement: Public Preview Is Sanitized

`GET /api/invitations/:token` MUST devolver solo datos no sensibles.

#### Scenario: Preview no filtra datos privados

- GIVEN un token válido
- WHEN se consulta el preview sin sesión
- THEN MUST devolver estado, título/destino/fechas del viaje, nombre del owner y `requiresAuthentication`
- AND MUST NOT devolver miembros, emails completos de terceros, `ownerId`, `userId`s ni `tokenHash`

#### Scenario: Token inexistente

- GIVEN un token que no existe
- WHEN se consulta el preview
- THEN MUST responder 404

### Requirement: Accept Requires Matching Verified Email

Aceptar MUST exigir sesión con email verificado que coincida con el email invitado, sobre
una invitación `pending` no vencida.

#### Scenario: Email de sesión no coincide

- GIVEN una invitación `pending` y un usuario con otro email
- WHEN hace `POST /api/invitations/:token/accept`
- THEN MUST responder 403
- AND MUST NOT agregarse como miembro

#### Scenario: Invitación no disponible

- GIVEN una invitación expirada, revocada o rechazada
- WHEN se intenta aceptar
- THEN MUST responder 410

#### Scenario: Aceptación idempotente

- GIVEN un usuario que ya aceptó la invitación
- WHEN vuelve a aceptar
- THEN MUST responder 200 con el `tripId`
- AND MUST NOT duplicarlo en `members`

### Requirement: Decline and Revoke Invalidate the Token

Rechazar (invitado) y revocar (owner) MUST dejar el token inutilizable, ser idempotentes
y no borrar el registro histórico.

#### Scenario: Rechazo cierra la invitación

- GIVEN una invitación `pending`
- WHEN el invitado la rechaza
- THEN MUST pasar a `declined`, MUST NOT agregar member, y el token MUST NOT volver a servir

#### Scenario: Revocar solo pending por el owner

- GIVEN una invitación `accepted` o `declined`
- WHEN el owner intenta revocarla
- THEN MUST responder 409 (solo se revoca `pending`)

### Requirement: Lazy Expiration and Security

Las invitaciones MUST expirar de forma perezosa por consulta (sin cron), con token de alta
entropía, rate limiting y sanitización de logs.

#### Scenario: Expiración perezosa

- GIVEN una invitación `pending` cuyo `expiresAt` ya pasó
- WHEN se consulta o se intenta aceptar
- THEN MUST tratarse como `expired`

#### Scenario: Logs sin datos sensibles

- GIVEN cualquier operación de invitación
- WHEN se emiten logs
- THEN MUST NOT contener el token plano
- AND MUST enmascarar el email cuando no sea necesario mostrarlo
