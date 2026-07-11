# Brand Identity Specification

## Purpose

Definir que toda la identidad **visible** y los **nombres de código vinculados a la marca**
usen "Alaia", sin reemplazo global ciego y sin tocar contenido histórico ni comportamiento.

## Requirements

### Requirement: User-Visible Surfaces Show Alaia

Todas las superficies visibles al usuario MUST mostrar "Alaia" y MUST NOT mostrar "Aurora":
PWA (manifest name/short_name), login, onboarding, trips, Experience, feedback, errores,
opening, emails (remitente, asuntos, copy) y títulos/metadata.

#### Scenario: Manifest PWA usa Alaia

- GIVEN el build de producción
- WHEN se inspecciona el `manifest.webmanifest`
- THEN `name` y `short_name` MUST contener "Alaia"
- AND MUST NOT contener "Aurora"

#### Scenario: Copy de la app no dice Aurora

- GIVEN cualquier pantalla visible (login/onboarding/trips/experience/feedback/error/opening)
- WHEN se renderiza
- THEN el texto de marca MUST ser "Alaia"
- AND MUST NOT aparecer "Aurora" en copy visible

#### Scenario: Emails usan Alaia

- GIVEN un email transaccional enviado
- WHEN se inspecciona remitente, asunto y cuerpo
- THEN MUST usar "Alaia" y el dominio de marca definido
- AND MUST NOT decir "Aurora"

### Requirement: Brand-Linked Code Identifiers Become Alaia or Neutral

Los identificadores de código **vinculados directamente a la marca antigua** (símbolos,
archivos, clases CSS) MUST convertirse a nombres Alaia o neutrales cuando aporte claridad.
Los identificadores técnicos **estables** cuyo cambio no aporte claridad real MAY conservarse
(p. ej. cookie e IndexedDB, por decisión explícita).

#### Scenario: Símbolos y archivos de marca se renombran

- GIVEN símbolos/archivos como `AuroraParticles`, `AuroraLayout`, `auroraStory`, `auroraMongo`
- WHEN se aplica el cambio
- THEN MUST renombrarse a un nombre Alaia o neutral, con imports actualizados
- AND `npm run typecheck` MUST pasar

#### Scenario: Contenido histórico se conserva

- GIVEN documentación histórica (`documentacion/*AURORA*.md`, `docs/00_AURORA_CONSTITUTION.md`)
- WHEN se aplica el cambio de marca
- THEN ese contenido MAY conservarse como registro histórico
- AND MUST NOT tratarse como superficie visible de la app

### Requirement: No Behavior or Architecture Change

El cambio de marca MUST NOT alterar comportamiento funcional ni arquitectura de producto.

#### Scenario: Suites verdes sin cambios de comportamiento

- GIVEN el cambio de marca aplicado
- WHEN se corren typecheck, backend, react, build y e2e
- THEN todas MUST pasar
- AND MUST NOT haber cambios de lógica de negocio (solo identidad y migración de claves)
