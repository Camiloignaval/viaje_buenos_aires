# Living Context React Integration Specification

## Qué revisar primero

React adapta datos ya cargados; no es dueño de la resolución ni inicia una segunda cadena de fetching.

## Purpose

Definir consumo no bloqueante del Living Travel Context desde React, reutilizando snapshots, cache y query keys existentes.

## Requirements

### Requirement: Adaptación de datos cargados

La integración React **MUST** entregar al resolver los datos Trip, User, Story y financieros disponibles en el render actual. **MUST NOT** duplicar reglas de ownership, precedencia, freshness o fallback y **MUST NOT** depender de `window` para resolver el dominio.

#### Scenario: Todos los datos están disponibles
- GIVEN caches existentes con Trip, User, Story y finanzas
- WHEN el consumidor solicita living context
- THEN recibe un snapshot compuesto por el resolver compartido
- AND React no reimplementa ninguna regla de dominio

#### Scenario: Datos llegan en renders sucesivos
- GIVEN Trip disponible y Story todavía pendiente
- WHEN el componente renderiza
- THEN obtiene inmediatamente un snapshot parcial
- AND narrative se actualiza cuando Story queda disponible

### Requirement: No bloqueo ni waterfalls

El consumidor **MUST** exponer estados parciales por módulo sin esperar a que todos terminen. Consultas independientes **SHOULD** poder progresar en paralelo y la indisponibilidad de un módulo **MUST NOT** suspender ni ocultar los demás.

#### Scenario: Finanzas lentas
- GIVEN destination, temporal y narrative disponibles, con finanzas pendientes
- WHEN se consume el snapshot
- THEN los tres módulos disponibles se entregan sin esperar financial

#### Scenario: Story falla
- GIVEN una consulta de Story fallida y datos Trip válidos
- WHEN se consume el snapshot
- THEN narrative queda `unavailable` con razón
- AND destination y temporal continúan disponibles

### Requirement: Reutilización de cache y ausencia de requests duplicados

La integración **MUST** reutilizar query keys y resultados ya existentes para una misma identidad de recurso. Dos consumidores equivalentes **MUST NOT** causar requests adicionales, y recalcular un snapshot por cambios locales **MUST NOT** iniciar fetching por sí mismo.

#### Scenario: Dos consumidores simultáneos
- GIVEN dos componentes montados con el mismo Trip, User y Story
- WHEN ambos consumen living context
- THEN comparten las entradas de cache existentes
- AND cada recurso remoto registra como máximo un request activo

#### Scenario: Re-render sin cambio de identidad
- GIVEN un snapshot resuelto y query keys estables
- WHEN ocurre un re-render ajeno al contexto
- THEN no se crea un request nuevo
- AND el snapshot reutilizable conserva semántica equivalente

#### Scenario: Cambio de identidad
- GIVEN un consumidor cambia a otro Trip
- WHEN cambian las query keys del recurso
- THEN solo se consultan los recursos faltantes de la nueva identidad
- AND no se invalida cache no relacionada

### Requirement: Límites de la capability

La integración **MUST NOT** agregar UI, IA, Companion, notificaciones, proveedores reales, un segundo engine ni un endpoint/backend agregador monolítico. **MUST NOT** alterar copy editorial de Etapa 6.

#### Scenario: Módulo futuro no soportado
- GIVEN una capability externa sin adapter ni datos cacheados
- WHEN React compone el snapshot
- THEN la capability se declara no disponible
- AND no se crea UI, notificación ni request implícito
