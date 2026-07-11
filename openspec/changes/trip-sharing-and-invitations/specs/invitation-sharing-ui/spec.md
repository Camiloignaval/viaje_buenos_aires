# Invitation Sharing UI Specification

## Purpose

Definir la UI mínima y editorial de Alaia Together: CTA de invitar en la Portada (solo owner),
compartir por WhatsApp / copiar enlace, y la vista `/invite/:token` con sus estados — sin
convertir la Portada en un panel administrativo.

## Requirements

### Requirement: Owner-Only Invite CTA in Portada

La Portada del viaje MUST mostrar la acción de invitar solo al owner y de forma discreta.

#### Scenario: Owner ve el CTA

- GIVEN un owner en `/trips/:tripId`
- WHEN se renderiza la Portada
- THEN MUST ver "Invitar a esta historia →" y, de forma discreta, personas actuales,
  invitaciones pendientes y cupos disponibles

#### Scenario: Editor no ve administración

- GIVEN un `editor` en `/trips/:tripId`
- WHEN se renderiza la Portada
- THEN MUST indicar que comparte la historia
- AND MUST NOT ver acciones de administración (invitar/revocar)

### Requirement: WhatsApp and Copy Sharing

Crear una invitación MUST permitir compartir el `inviteUrl` por WhatsApp y copiarlo, sin
API oficial ni acceso a contactos.

#### Scenario: Enlace de WhatsApp

- GIVEN un `inviteUrl` devuelto por el backend
- WHEN se arma el enlace de compartir
- THEN MUST ser `https://wa.me/?text=<texto-codificado>` con el `inviteUrl` incluido
- AND MUST ofrecer también "Copiar enlace"

### Requirement: Invite View States

`/invite/:token` MUST cubrir cada estado con copy propio y acciones claras, sin errores técnicos visibles.

#### Scenario: Con sesión y email coincide

- GIVEN un usuario con sesión cuyo email coincide con el invitado
- WHEN abre `/invite/:token` de una invitación `pending`
- THEN MUST ver "¿Querés formar parte de esta historia?" con Aceptar / Rechazar

#### Scenario: Con sesión y email no coincide

- GIVEN un usuario con sesión cuyo email NO coincide
- WHEN abre la invitación
- THEN MUST ver "Esta invitación fue enviada a otro correo" sin revelar el correo completo
- AND MUST ofrecer cerrar sesión / iniciar con el correo correcto / volver a Mis viajes
- AND MUST NOT permitir aceptar con otro email

#### Scenario: Estados terminales

- GIVEN una invitación expirada, revocada, rechazada o ya aceptada, o un token inválido
- WHEN se abre `/invite/:token`
- THEN MUST mostrar un copy propio del estado y acciones para volver, sin errores técnicos

#### Scenario: Navegación final tras aceptar

- GIVEN una aceptación exitosa
- WHEN el frontend responde
- THEN MUST navegar a `/trips/:tripId` (Portada)
- AND MUST NOT navegar directamente a la Experience
