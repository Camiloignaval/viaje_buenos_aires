# First Real Experience Specification

## Purpose

Composición determinista y sin efectos del primer acompañamiento.

## Requirements

### Requirement: Cadena canónica completa

El sistema **MUST** encadenar cinco APIs autoritativas con un instante lógico y Living Context `settled`.

#### Scenario: Primer día local exitoso

- GIVEN Buenos Aires al `2026-10-03T15:00:00.000Z`
- WHEN se ejecuta la experiencia
- THEN Living Context queda `settled`, Decision produce `trip_start_today` y Companion produce `in_app`
- AND Editorial produce `today-01` / `Hoy comienza una nueva historia.` y Memory `trip_started`

#### Scenario: Valores finales inmutables

- GIVEN una cadena exitosa
- WHEN se inspecciona el resultado
- THEN resultado, transiciones, mensaje, candidato e intent **MUST** ser inmutables

### Requirement: Propagación terminal

El sistema **MUST** terminar ante abstención, silencio o descarte sin sustituir su autoridad.

#### Scenario: Abstención de Decision

- GIVEN una resolución no accionable
- WHEN Decision se abstiene
- THEN Companion, Editorial y Memory **MUST NOT** ser llamados

#### Scenario: Silencio de Companion

- GIVEN una decisión accionable limitada por Companion
- WHEN Companion devuelve silencio
- THEN Editorial y Memory **MUST NOT** ser llamados ni existir DeliveryIntent

#### Scenario: Descarte de Memory

- GIVEN acción y mensaje autoritativos que Memory descarta
- WHEN finaliza la clasificación
- THEN **MUST** conservar el descarte sin DeliveryIntent ni persistencia

### Requirement: Correlación y autoridad

Cada capa **MUST** recibir la salida anterior; **MUST NOT** recrear decisiones, acciones, mensajes ni recuerdos.

#### Scenario: Lineage exitoso

- GIVEN una ejecución completa
- WHEN se comparan transiciones
- THEN cada input **MUST** ser la salida previa

#### Scenario: Lineage inválido

- GIVEN una salida no correlacionada
- WHEN la capa siguiente la rechaza
- THEN la experiencia **MUST** fallar cerrada sin fabricar reemplazos

### Requirement: DeliveryIntent abstracto

DeliveryIntent **MAY** usar `push | in_app | timeline | memory`, pero **MUST NOT** ejecutar entrega ni I/O.

#### Scenario: Intent exitoso

- GIVEN la cadena canónica aceptada por Memory
- WHEN concluye la composición
- THEN existe un intent inmutable `pending`, `in_app`, con referencias categóricas

#### Scenario: Resultado terminal

- GIVEN una abstención, silencio, descarte o error
- WHEN concluye anticipadamente
- THEN DeliveryIntent **MUST** ser ausente

### Requirement: Trace seguro y ordenado

El trace **MUST** identificar en orden capas productoras, transformadoras o descartadoras y Memory, sin IDs, texto, payloads, PII ni errores crudos.

#### Scenario: Trace exitoso

- GIVEN una ejecución completa
- WHEN se inspecciona el trace
- THEN ordena Living Context, Decision, Companion, Editorial y Memory
- AND sólo expone categorías permitidas, incluido `trip_started`

#### Scenario: Trace terminal

- GIVEN un resultado terminal en cualquier capa
- WHEN se inspecciona el trace
- THEN finaliza en esa capa con razón categórica y sin eventos posteriores

### Requirement: Fallo cerrado

Inputs inválidos, contexto no settled y dependencias fallidas **MUST** producir salida tipada sin filtrar datos privados.

#### Scenario: Contexto no settled

- GIVEN Living Context no alcanza `settled`
- WHEN la experiencia intenta continuar
- THEN termina como `unsettled_context` sin invocar Decision

#### Scenario: Error de dependencia

- GIVEN una API falla o devuelve contrato inválido
- WHEN se ejecuta la experiencia
- THEN termina como `dependency_error` sin mensaje crudo ni llamadas posteriores

### Requirement: Simulador interno

El simulador **MUST** ser dev/test-only e inalcanzable desde entrypoints productivos.

#### Scenario: Fixture repetible

- GIVEN el simulador interno
- WHEN se ejecuta dos veces con el fixture canónico
- THEN produce igual resultado sin red, storage, UI ni reloj ambiental

#### Scenario: Ausencia productiva

- GIVEN el grafo de entrypoints productivos
- WHEN se auditan sus imports
- THEN ninguno **MUST** importar ni exportar el simulador

### Requirement: Arquitectura preservada

La experiencia **MUST NOT** agregar reglas, providers, IA, UI, Push, persistencia ni cambiar motores.

#### Scenario: Prueba byte-unchanged

- GIVEN el baseline previo
- WHEN se compara el cambio completo
- THEN los cinco motores permanecen byte-unchanged
- AND no existen nuevas dependencias o efectos prohibidos
