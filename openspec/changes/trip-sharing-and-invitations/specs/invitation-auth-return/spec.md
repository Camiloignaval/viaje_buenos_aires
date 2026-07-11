# Invitation Auth Return Specification

## Purpose

Permitir que un invitado sin sesión inicie sesión y **regrese automáticamente** a la
invitación, sin aceptar automáticamente y sin exponer open redirects.

## Requirements

### Requirement: Safe Return-To After Login

El login MUST honrar un `returnTo` **solo** si apunta a una ruta interna permitida, y MUST
descartar cualquier destino externo.

#### Scenario: Retorno interno válido

- GIVEN `/login?returnTo=/invite/abc`
- WHEN el usuario completa el login por código
- THEN MUST navegar a `/invite/abc`

#### Scenario: Open redirect bloqueado

- GIVEN `returnTo` con `http://malicioso`, `//malicioso` o un esquema
- WHEN se procesa el login
- THEN MUST descartarse y usar el fallback interno (`/trips`)

#### Scenario: returnTo se conserva entre los dos pasos

- GIVEN el login en el paso de email con `returnTo` en la URL
- WHEN avanza al paso de código
- THEN el `returnTo` MUST conservarse hasta el final del login

### Requirement: No Auto-Accept on Return

Volver a la invitación tras el login MUST mostrar la pantalla de decisión, nunca aceptar solo.

#### Scenario: Regreso muestra decisión

- GIVEN un invitado que inició sesión desde `/invite/:token`
- WHEN regresa a `/invite/:token`
- THEN MUST ver las acciones Aceptar / Rechazar
- AND MUST NOT haberse agregado como miembro automáticamente

### Requirement: Unauthenticated Invite Guides to Login

`/invite/:token` sin sesión MUST guiar al login sin ofrecer aceptar.

#### Scenario: Sin sesión no muestra aceptar

- GIVEN un usuario sin sesión en `/invite/:token`
- WHEN se renderiza
- THEN MUST explicar que debe iniciar sesión con el correo invitado
- AND MUST ofrecer "Iniciar sesión para continuar →" hacia `/login?returnTo=/invite/:token`
- AND MUST NOT mostrar una acción de aceptación activa
