# Living Context Weather Specification

## Purpose

Definir contexto Weather decision-driven, reemplazable y parcial.

## Requirements

### Requirement: Contrato mínimo orientado a decisiones

Weather **MUST** exponer únicamente condición, temperatura, probabilidad de precipitación, lluvia/tormenta/nieve, amanecer/atardecer, `source`, `fetchedAt`, `effectiveAt`, `expiresAt`, freshness y confidence. Cada campo **MUST** habilitar decisiones futuras de indoor/outdoor, vestimenta o luz natural; **MUST NOT** copiar datos incidentales.

#### Scenario: Respuesta normalizada
- GIVEN una respuesta válida con campos útiles e incidentales
- WHEN se normaliza Weather
- THEN el snapshot contiene exactamente los campos contractuales
- AND omite el JSON y los campos incidentales

### Requirement: Ownership geográfico y ventana local

La consulta **MUST** usar coordenadas de ciudad y timezone IANA del Trip. **MUST** ocurrir solo con Trip `in_progress` y fecha solicitada igual a hoy en el destino; **MUST NOT** usar timezone de ejecución.

#### Scenario: Dentro de ventana con cruce DST
- GIVEN un Trip en curso y un instante cercano a un cambio DST
- WHEN el datetime local explícito corresponde a hoy en el destino
- THEN se realiza un request con esos datos del Trip
- AND la fecha local no se desplaza por la timezone de ejecución

#### Scenario: Fuera de ventana
- GIVEN un Trip fuera de curso o una fecha distinta de hoy local
- WHEN se resuelve Weather
- THEN queda `unavailable` con `weather_outside_window`
- AND se realizan cero requests al proveedor

### Requirement: Provider normalizado y reemplazable

El adapter **MUST** ocultar Open-Meteo, validar la respuesta y mapear condición, unidades y timestamps. Payload inválido, status no exitoso o timeout **MUST** producir falla tipada sin filtrar detalles al dominio.

#### Scenario: Proveedor exitoso
- GIVEN un payload Open-Meteo válido
- WHEN el adapter lo procesa
- THEN devuelve un snapshot normalizado con unidades contractuales

#### Scenario: Respuesta inválida o timeout
- GIVEN un payload incompleto, status no exitoso o timeout
- WHEN el adapter lo procesa
- THEN devuelve una falla tipada sanitizada
- AND no entrega un snapshot parcial como disponible

### Requirement: Cache de éxitos y deduplicación

El cache **MUST** conservar solo éxitos 15 minutos por recurso y deduplicar consultas concurrentes equivalentes. Errores, timeouts y payloads inválidos **MUST NOT** cachearse.

#### Scenario: TTL y concurrencia
- GIVEN dos consultas concurrentes equivalentes y una respuesta válida
- WHEN ambas se resuelven y se repite antes de 15 minutos
- THEN existe un único request y se reutiliza el éxito
- AND tras 15 minutos se permite un nuevo request

#### Scenario: Falla no cacheada
- GIVEN una consulta que falla o devuelve payload inválido
- WHEN se repite la consulta
- THEN se intenta un nuevo request

### Requirement: Provenance y freshness honestas

Freshness **MUST** derivarse del reloj efectivo; datos vencidos **MUST NOT** presentarse como actuales y confidence **MUST** ser `unknown` si el proveedor no la informa.

#### Scenario: Dato vence
- GIVEN un éxito con expiración conocida y confidence ausente
- WHEN el reloj supera `expiresAt`
- THEN freshness indica stale y confidence es `unknown`

### Requirement: Falla parcial y observación segura

Una falla Weather **MUST** dejarlo `unavailable` con razón sanitizada sin invalidar otros módulos. El observer **MUST** registrar solo categoría, estado, source categórico y timing; **MUST NOT** registrar coordenadas, PII, presupuesto ni tokens.

#### Scenario: Falla aislada
- GIVEN contexto base válido y una falla Weather con datos sensibles
- WHEN se resuelve y observa el resultado
- THEN los demás módulos permanecen disponibles
- AND el evento omite datos sensibles y detalles crudos

### Requirement: Límites y extensibilidad localizada

Weather **MUST NOT** crear feature flags, placeholders, registry genérico, segundo engine/resolver, UI, Companion, IA, notificaciones, geocoding/GPS, persistencia ni configuración. Otro proveedor **MUST** poder reemplazarlo mediante el mismo contrato.

#### Scenario: Sustitución del proveedor
- GIVEN un adapter alternativo que cumple el contrato
- WHEN se inyecta en Weather
- THEN los consumidores reciben la misma forma normalizada
- AND no requieren cambios ni capabilities ficticias
