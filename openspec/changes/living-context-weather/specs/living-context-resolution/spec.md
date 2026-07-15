# Delta for Living Context Resolution

## MODIFIED Requirements

### Requirement: Resolución parcial y capabilities

El snapshot **MUST** representar destination, temporal, financial, narrative y weather por separado con `available` o `unavailable`, razón verificable y capability correspondiente. `capabilities.weather` **MUST** ser `true` exclusivamente cuando `weather.status === "available"`; una falla o timeout opcional **MUST NOT** impedir los demás módulos ni lanzar un error global.

(Previously: el snapshot parcial y sus capabilities comprendían solo cuatro módulos Foundation.)

#### Scenario: Contexto completo con Weather
- GIVEN inputs suficientes y adapters exitosos
- WHEN se resuelve el contexto
- THEN los cinco módulos están `available`
- AND `capabilities.weather` es `true`

#### Scenario: Weather falla
- GIVEN los cuatro módulos Foundation disponibles y Weather fallido
- WHEN se resuelve el contexto
- THEN Weather queda `unavailable` con razón y capability `false`
- AND los cuatro módulos Foundation se conservan

#### Scenario: Adapter financiero falla
- GIVEN destino, fechas y Story válidos, pero el adapter financiero falla
- WHEN se resuelve el contexto
- THEN financial queda `unavailable` con razón
- AND los otros módulos elegibles se conservan

#### Scenario: Inputs mínimos
- GIVEN solo un destino resoluble y Weather no elegible
- WHEN se resuelve el contexto
- THEN destination puede quedar `available`
- AND los demás módulos explican su indisponibilidad

### Requirement: Freshness, provenance y observabilidad

Cada módulo **MUST** declarar provenance, instante de observación y freshness calculada con el reloj inyectado. La observación **MUST** informar estado/falla por módulo usando source categórico y **MUST NOT** incluir PII, coordenadas exactas, presupuesto, tokens ni payloads del proveedor.

(Previously: la observación excluía PII y coordenadas, sin exigir source categórico ni excluir secretos y payloads dinámicos.)

#### Scenario: Snapshot envejecido
- GIVEN un módulo con observación anterior al umbral contractual
- WHEN el reloj avanza más allá del umbral
- THEN el módulo se marca stale sin perder su provenance

#### Scenario: Falla Weather observada de forma segura
- GIVEN una falla Weather con coordenadas y detalles del proveedor
- WHEN se registra el resultado
- THEN el evento identifica módulo, categoría y razón sanitizada
- AND omite coordenadas, PII, presupuesto, tokens y payload crudo

### Requirement: Semántica de los cinco módulos

Destination **MUST** resolver identidad, locale y timezone con fallback explícito; temporal **MUST** evaluar fechas en la timezone del destino, incluidos cruces DST; financial **MUST** adaptar solo datos financieros existentes; narrative **MUST** devolver contenido curado literal y sus ids; weather **MUST** usar coordenadas y timezone del Trip y limitarse a su ventana local elegible. Datos ausentes **MUST NOT** ser inventados.

(Previously: la semántica contractual cubría únicamente los cuatro módulos Foundation.)

#### Scenario: Cambio DST
- GIVEN fechas que cruzan un cambio DST y timezone válida
- WHEN se calcula el estado temporal con el reloj inyectado
- THEN la clasificación usa tiempo local del destino sin desplazar el día del viaje

#### Scenario: Ownership Weather
- GIVEN Story, navegador o servidor contradicen coordenadas o timezone del Trip
- WHEN se resuelve Weather
- THEN se usan exclusivamente coordenadas y timezone del destino del Trip

#### Scenario: Narrativa literal
- GIVEN una Story con copy curado y ambos ids
- WHEN se resuelve narrative
- THEN copy, `storyId` y `baseStoryId` coinciden exactamente con la Story

### Requirement: Límites de la capability

Esta capability **MUST NOT** crear IA, Companion, notificaciones, UI, feature flags, placeholders, un segundo engine/resolver, registry genérico ni backend agregador. Weather **MAY** usar un provider real solo mediante un contrato reemplazable y localizado; futuras extensiones **MUST** seguir slices explícitos sin anticipar su implementación.

(Previously: se prohibía todo proveedor real y solo se permitían contratos inyectables futuros.)

#### Scenario: Dependencia Weather no configurada
- GIVEN que no existe provider Weather configurado
- WHEN se resuelve el contexto
- THEN el snapshot Foundation sigue siendo válido
- AND Weather queda unavailable sin crear requests ni capabilities ficticias
