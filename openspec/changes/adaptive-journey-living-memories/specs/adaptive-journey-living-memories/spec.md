# Adaptive Journey & Living Memories Specification

## Purpose

Representar momentos contextuales y recuerdos seguros coordinando autoridades existentes.

## Requirements

### Requirement: Pipeline autoritativo

El sistema **MUST** encadenar autoridades canonicas, consumir solo `selected` y producir maximo un protagonista; **MUST NOT** crear bypass, cola ni promocion.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Seleccion unica|varias evaluaciones accionables|compone|solo `selected` continua|
|Terminal|selected no autoriza superficie|representa|silencio; ninguna perdedora se promueve|

### Requirement: Evidencia Story exacta

Weather/Light **MUST** usar metadata estructurada exacta y vigente; Story faltante, legacy o contradictoria **MUST** fallar cerrado sin inferir texto.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Exacta|metadata y ventana validas|adapta|conserva evidencia autorizada|
|Insegura|metadata ausente, legacy o contradictoria|adapta|cero candidato|

### Requirement: Weather autorizado

Weather **MUST** ser fresh, visible, vigente, member-scoped y permitido por metadata, preferencia, receipt e intent; cualquier incumplimiento **MUST** silenciar.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Visible|todas las condiciones validas|representa|un momento Weather|
|Silencio|stale, unavailable, error, fuera de ventana o condicion faltante|representa|`null`|
|Aislamiento Financial|Financial falla y Weather vale|resuelve|Weather continua|

### Requirement: Gate Weather productivo

El provider **MUST** estar deshabilitado por defecto. Dev/test **MAY** habilitarlo explicitamente; produccion **MUST** exigir aprobacion y atribucion. Membership, trip y ventana **MUST** validarse antes de consultar.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Gate cerrado|flag off|solicita|cero provider calls|
|Scope invalido|no miembro, trip mismatch o fuera de ventana|solicita|cero provider calls|

### Requirement: Light autorizado

Light **MUST** exigir evidencia fresh, vigente y `photoMoment`; **MUST NOT** agregar geolocalizacion ni copy de tarea.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Visible|evidencia e intent validos|representa|copy Editorial literal|
|Invalido|stale, incompleto o fuera de ventana|representa|silencio|

### Requirement: Outcomes y memoria

Last Day **MUST** preservar `memory` y persistir idempotentemente sin forzar `in_app`. Weather/Light **MAY** coexistir con `MemoryDiscard(transient_context)` y **MUST NOT** persistir memoria.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Last Day|candidato autorizado|compone|persiste una vez; cero momento contextual|
|Transitorio|Weather/Light con discard|compone|delivery editorial; cero recuerdos|

### Requirement: Receipts y continuidad

Receipts **MUST** conservar lifecycle, expiracion, jerarquia, disponibilidad y scope usuario-viaje existentes; **MUST** permitir maximo una superficie.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Continuidad|receipt visible/dismissed/expired|navega, recarga o vuelve same-tab|restaura solo su scope|
|Storage inseguro|corrupto o inaccesible|carga|silencio sin wrapper|

### Requirement: Memory API semantica

POST/GET **MUST** exigir sesion, membership y scope; escritura **MUST** ser idempotente bajo concurrencia. Lectura **MUST** devolver maximo un hito, DTO exacto `{type,text}` y separacion legacy.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Concurrencia|POST equivalentes de miembro|concurren|un recuerdo|
|Lectura|hitos y legacy|GET de miembro|un `{type,text}` semantico|
|Ownership|usuario/trip/story mismatch|lee o escribe|cero exposicion/modificacion|
|Falla segura|Memory falla|continua|contenido sobrevive; recuerdo ausente|

### Requirement: Consumidor estable

El consumidor **MUST** usar instante estable y deduplicacion TanStack; **MUST NOT** causar loops, requests duplicados ni perdida del render persistido.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Rerender|inputs estables|rerenderiza|una evaluacion/request por identidad|

### Requirement: Privacidad y observacion

UI, DTO y observer **MUST** omitir coordenadas, provider, evidencia, IDs, copy observado y errores. Eventos **MUST** contener solo categorias exactas y ser best-effort.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Observer hostil|datos sensibles y callback fallido|observa|solo categorias; resultado intacto|

### Requirement: UX accesible

Weather/Light **MUST** ocupar la ranura del capitulo; memoria, TripAlbum; silencio, `null`. Copy **MUST** ser Editorial literal y UI **MUST** ser accesible, responsive, overflow-safe, reduced-motion y PWA-compatible.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Superficies|momento y recuerdo autorizados|representa|cada uno aparece solo donde corresponde|
|Silencio total|informacion insuficiente o intent invalido|representa|cero nodo, espacio, motion o aria|

### Requirement: Aislamiento terminal

Cada falla **MUST** detener solo su rama, sin reconstruir decisiones ni perder contenido valido.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Weather falla|regla temporal valida|compone|regla temporal continua|
|Contrato terminal|Story legacy, scope mismatch o delivery invalido|procesa|silencio sin downstream|
