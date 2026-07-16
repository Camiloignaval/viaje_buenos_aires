# Living Context Resolution Specification

## Qué revisar primero

La unidad contractual es un snapshot parcial de cuatro módulos; una ausencia o falla local nunca invalida el contexto completo.

## Purpose

Definir un contexto de viaje determinístico, trazable y consumible sin React a partir de Trip, User y Story opcionales.

## Requirements

### Requirement: Ownership y precedencia

El resolver **MUST** aplicar esta precedencia: Trip para destino y fechas, Story para narrativa curada, User para preferencias y catálogos como fallback. **MUST** preservar `storyId` y `baseStoryId` sin intercambiarlos, **MUST NOT** mutar inputs y **MUST** producir el mismo resultado ante mismos inputs, reloj y adapters.

#### Scenario: Fuentes concordantes
- GIVEN Trip, User y Story válidos
- WHEN se resuelve el contexto
- THEN cada campo declara su owner efectivo y source
- AND los identificadores narrativos permanecen literales

#### Scenario: Story contradice al Trip
- GIVEN Story y Trip con destino o fechas distintos
- WHEN se resuelve el contexto
- THEN destino y fechas provienen del Trip
- AND la narrativa curada continúa proviniendo de Story

### Requirement: Resolución parcial y capabilities

El snapshot **MUST** representar destination, temporal, financial y narrative por separado con `available` o `unavailable`, razón verificable y capability correspondiente. Una falla, ausencia o timeout de un módulo **MUST NOT** impedir los demás; el resolver **MUST NOT** lanzar un error global por una dependencia opcional.

#### Scenario: Contexto completo
- GIVEN inputs suficientes y adapters exitosos
- WHEN se resuelve el contexto
- THEN los cuatro módulos están `available`
- AND sus capabilities reflejan datos utilizables

#### Scenario: Adapter financiero falla
- GIVEN destino, fechas y Story válidos, pero el adapter financiero falla
- WHEN se resuelve el contexto
- THEN financial queda `unavailable` con razón y los otros módulos se conservan

#### Scenario: Inputs mínimos
- GIVEN solo un destino resoluble
- WHEN se resuelve el contexto
- THEN destination puede quedar `available`
- AND temporal, financial y narrative explican su indisponibilidad

### Requirement: Freshness, provenance y observabilidad

Cada módulo **MUST** declarar provenance, instante de observación y freshness calculada con el reloj inyectado. La observación **MUST** informar estado/falla por módulo y **MUST NOT** incluir PII ni coordenadas exactas.

#### Scenario: Snapshot envejecido
- GIVEN un módulo con observación anterior al umbral contractual
- WHEN el reloj avanza más allá del umbral
- THEN el módulo se marca stale sin perder su provenance

#### Scenario: Falla observada de forma segura
- GIVEN una falla local con datos sensibles en el input
- WHEN se registra el resultado
- THEN el evento identifica módulo y razón sanitizada
- AND omite PII y coordenadas exactas

### Requirement: Semántica de los cuatro módulos

Destination **MUST** resolver identidad, locale y timezone con fallback explícito; temporal **MUST** evaluar fechas en la timezone del destino, incluidos cruces DST; financial **MUST** adaptar solo datos financieros existentes; narrative **MUST** devolver contenido curado literal y sus ids. Datos ausentes **MUST NOT** ser inventados.

#### Scenario: Cambio DST
- GIVEN fechas que cruzan un cambio DST y timezone válida
- WHEN se calcula el estado temporal con el reloj inyectado
- THEN la clasificación usa tiempo local del destino sin desplazar el día del viaje

#### Scenario: Narrativa literal
- GIVEN una Story con copy curado y ambos ids
- WHEN se resuelve narrative
- THEN copy, `storyId` y `baseStoryId` coinciden exactamente con la Story

### Requirement: Límites de la capability

Esta capability **MUST NOT** crear IA, Companion, notificaciones, UI, proveedores reales, un segundo engine ni un backend monolítico. Extensiones futuras **MAY** exponerse solo como contratos inyectables.

#### Scenario: Dependencia futura no configurada
- GIVEN que no existe proveedor externo configurado
- WHEN se resuelve el contexto
- THEN el snapshot parcial sigue siendo válido
- AND no se realiza ninguna consulta a un proveedor real
