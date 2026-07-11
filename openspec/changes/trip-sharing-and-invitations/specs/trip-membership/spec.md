# Trip Membership Specification

## Purpose

Definir el alta atómica de miembros, los roles `owner`/`editor` y la política de cupo
(`expectedTravelers`), reutilizando el modelo `members` existente.

## Requirements

### Requirement: Atomic Membership on Accept

Aceptar una invitación MUST agregar al usuario a `members` de forma atómica, sin duplicar
y respetando el cupo, incluso ante requests concurrentes.

#### Scenario: Alta única

- GIVEN una invitación válida aceptada por el invitado
- WHEN se procesa
- THEN MUST agregarse a `members` con rol `editor` exactamente una vez

#### Scenario: Carrera por el último cupo

- GIVEN un viaje con un solo cupo libre y dos aceptaciones concurrentes
- WHEN ambas se procesan
- THEN solo una MUST agregarse
- AND la otra MUST responder 409 (cupo lleno)

### Requirement: Roles and Permissions

Los roles `owner` y `editor` MUST autorizarse según el contrato del MVP.

#### Scenario: Editor accede en solo lectura

- GIVEN un usuario con rol `editor`
- WHEN lista el trip, abre la Portada, abre la Experience o lee contenido conectado
- THEN MUST permitirse

#### Scenario: Editor no administra

- GIVEN un usuario con rol `editor`
- WHEN intenta crear/revocar invitaciones, cambiar owner, eliminar el trip o editar `expectedTravelers`
- THEN MUST responder 403

### Requirement: Capacity Based on expectedTravelers

El cupo MUST basarse en `expectedTravelers` (total incluido el owner), sin reservar cupo
por invitaciones vencidas.

#### Scenario: Crear respeta el cupo con pendientes

- GIVEN `expectedTravelers = N` y `members + pendientes no vencidas = N`
- WHEN el owner intenta crear otra invitación
- THEN MUST responder 409

#### Scenario: Vencidas no reservan cupo

- GIVEN invitaciones `expired`, `revoked` o `declined`
- WHEN se evalúa el cupo
- THEN esas invitaciones MUST NOT contar contra `expectedTravelers`
