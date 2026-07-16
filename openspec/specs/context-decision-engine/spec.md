# Context Decision Engine Specification

## Requirements

### Requirement: Motor determinista

El motor **MUST** ser puro, usar reloj inyectado, evaluar reglas nombradas en orden estable y devolver `Act|Abstain`.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Determinismo|mismos inputs/reloj|repite|resultado idéntico|
|Inmutabilidad|inputs congelados|evalúa|no muta|
|Reloj|reloj inyectado|evalúa|usa ese reloj|
|Orden|varias reglas|evalúa|traza estable|
|Actúa|evidencia suficiente|evalúa|devuelve `Act`|
|Abstiene|evidencia insuficiente|evalúa|devuelve `Abstain`|
|Múltiples|varias reglas|evalúa|registra todas|
|Conflicto|acciones incompatibles|resuelve|selecciona una|
|Dedupe|acciones equivalentes|resuelve|conserva una|
|Ventana|acción no vigente/vigente|evalúa|abstiene/actúa|
|Expiración|acción vencida|reevalúa|no reutiliza|

### Requirement: Reglas temporales

Las reglas **MUST** usar timezone IANA destino/DST. Temporal derivado para el reloj actual **MAY** usarse stale; ningún otro módulo **MAY** hacerlo.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Inicio mañana|comienza mañana local|evalúa|actúa `trip_start_tomorrow`|
|Inicio hoy|comienza hoy local|evalúa|actúa `trip_start_today`|
|Durante|viaje en curso|evalúa inicio|abstiene|
|Ya iniciado|inicio anterior|evalúa inicio|abstiene|
|Timezone|servidor difiere|evalúa|usa día destino|
|DST|offset cambia|evalúa|conserva día destino|
|Duplicado|inicio procesado|evalúa|abstiene|
|Último día|finaliza hoy local|evalúa|actúa `trip_last_day`|
|Día anterior|finaliza mañana|evalúa último día|abstiene|
|Finalizado|fin pasado|evalúa|abstiene|
|Fechas incompletas|falta inicio/fin|evalúa|abstiene|
|Un día|inicia/finaliza hoy|evalúa|prioridad elige una|

### Requirement: Weather y Light

Weather **MUST** estar `available`, fresh, vigente y coherente. Weather/Light **MUST** exigir actividad existente, metadata curada estructurada y ventana vigente; Story productiva/texto libre **MUST** abstenerse.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Lluvia outdoor|fresh+outdoor+lluvia relevante|evalúa|actúa `weather_attention_candidate`|
|Indoor|actividad indoor|evalúa Weather|abstiene|
|Stale|Weather stale|evalúa|abstiene|
|Unavailable|Weather unavailable|evalúa|abstiene|
|Sin metadata|actividad no etiquetada|evalúa|abstiene|
|Señal débil|precipitación insuficiente|evalúa|abstiene|
|Fuera ventana|actividad/Weather fuera|evalúa|abstiene|
|Inexistente|activityId desconocido|evalúa|abstiene|
|Contradicción|señales Weather incompatibles|evalúa|abstiene|
|Financial aislado|Financial falla|evalúa|Weather continúa|
|Weather aislado|Weather falla|evalúa|temporales continúan|
|Luz válida|sunrise/sunset fresh+photoMoment|evalúa|actúa `light_moment_candidate`|
|Luz sin metadata|falta photoMoment/bestMoment|evalúa|abstiene|
|Luz stale|sunrise/sunset stale|evalúa|abstiene|
|Luz pasada|ventana terminó|evalúa|abstiene|
|Texto libre|texto sugiere contexto|evalúa|abstiene sin normalizar|

### Requirement: Gates y resolución

El motor **MUST** aplicar gates cerrados, seleccionar máximo una acción por prioridad/orden y conservar toda evaluación ordenada.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Capability|capability ausente|evalúa|abstiene|
|Preferencia|acompañamiento desactivado|evalúa|abstiene|
|Insuficiente|evidencia insuficiente|evalúa|abstiene|
|Inválida|dato inválido|evalúa|abstiene|
|Parcial|contexto parcial|evalúa|afectada abstiene; otras siguen|
|Conflictiva|evidencia contradictoria|evalúa|abstiene|
|Procesado|dedupe key procesada|evalúa|abstiene|
|Prioridad|acciones distintas|resuelve|selecciona una|
|Coexistencia|acciones no relacionadas|resuelve|solo coexisten en traza|
|Equivalencia|acciones equivalentes|resuelve|deduplica|
|Entrega|acción seleccionada|devuelve|sin canal/copy final|

### Requirement: Vigencia, explicación y fronteras

Cada evaluación **MUST** declarar regla, evidencia, módulos, freshness, reasonCode, confianza `sufficient|insufficient|unknown`, dedupe key estable sin timestamp, `validFrom|validUntil` y `effectiveAt` aplicable en timezone destino. Observer **MUST** emitir solo categorías, disponibilidad, freshness y duración sanitizada.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Explicación|acción/abstención|inspecciona|evidencia, vigencia, causa; sin score|
|Observer|sensibles/error crudo|observa|omite ids, keys, PII, coordenadas, payload, copy, secretos|
|Fronteras|resultado|consume|Companion no entrega; Editorial no redacta; Memory no persiste snapshots|
|Alcance|evaluación|ejecuta|sin IA, UI, push, geofencing, Experience, endpoint u Open-Meteo directo|
