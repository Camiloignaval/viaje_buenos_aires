# Companion Orchestrator Specification

## Purpose

Orquestar exclusivamente la acción ya seleccionada por Context Decision Engine hacia acción conceptual o silencio, sin decidir, redactar ni entregar.

## Requirements

### Requirement: Ejecución pura y frontera de selección

El orquestador **MUST** ser puro, determinista, inmutable, usar reloj inyectado y, dentro de `decisionRun`, consumir únicamente `selected`; **MUST NOT** promover `evaluations` ni reinterpretar Living Context.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Determinismo|inputs y reloj iguales|ejecuta dos veces|resultado idéntico|
|Inmutabilidad|inputs congelados|ejecuta|no muta ni lanza|
|Sin selección|`selected=null`, evaluaciones Act|ejecuta|silencio `no_selected_decision`|
|Preferencia|acompañamiento desactivado|ejecuta|silencio `preference_disabled` sin excepción|
|Act única|selected Act válida|ejecuta|evalúa sólo esa Act|
|No Act|selected no es Act|ejecuta|silencio `invalid_selected_decision`|
|Malformada|Act carece de contrato requerido|ejecuta|silencio `invalid_selected_decision`|

### Requirement: Preservación y vigencia

`CompanionAction` **MUST** preservar sin reinterpretar `id`, `kind`, `priority`, `dedupeKey`, evidencia, ventana y payload. `validFrom` **MUST** ser inclusivo; `validUntil` y `expiresAt`, exclusivos.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Preserva|Act autorizada|produce acción|campos conservan significado y valores|
|Futura|ahora anterior a `validFrom`|ejecuta|silencio `not_yet_valid`|
|Inicio exacto|ahora igual a `validFrom`|ejecuta|pasa gate temporal|
|Fin exacto|ahora igual a `validUntil`|ejecuta|silencio `decision_expired`|
|Expiry exacto|ahora igual a `expiresAt`|ejecuta|silencio `decision_expired`|
|Ventana inválida|límites ausentes/invertidos/invalid Date|ejecuta|silencio `invalid_selected_decision`|

### Requirement: Dedupe e historial seguro

El orquestador **MUST NOT** repetir una `dedupeKey` presente en procesadas o historial. Historial vacío **MUST** ser válido; cualquier entrada suministrada incompleta, inválida o futura **MUST** cerrar en silencio.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Procesada|key en procesadas|ejecuta|silencio `already_processed`|
|Histórica|misma key en historial|ejecuta|silencio `already_processed`|
|Vacío|historial caller-owned vacío|ejecuta|continúa sin I/O|
|Inseguro|entrada incompleta/inválida/futura|ejecuta|silencio `invalid_history`|

### Requirement: Política de frecuencia nombrada

`CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS` **MUST** imponer 6h entre acciones. Una `high` distinta **MAY** pasar desde 60m sólo si no hubo otra `high` durante los 60m abiertos anteriores. Dedupe y vigencia **MUST NOT** admitir bypass; no **MAY** usar scores.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Normal/low reciente|decisión distinta y última acción hace menos de 6h|ejecuta|silencio `frequency_limited`|
|Seis horas|normal/low y última acción hace 6h o más|ejecuta|acción|
|High temprana|high distinta antes de 60m|ejecuta|silencio `frequency_limited`|
|High límite|high distinta a 60m, sin high posterior|ejecuta|acción|
|High reciente|otra high dentro de 60m|ejecuta|silencio `recent_high_action`|
|High dedupe/vencida|key repetida o decisión vencida|ejecuta|bypass prohibido|

### Requirement: Canales conceptuales cerrados

Cada `DecisionKind` **MUST** mapear a un único label: `trip_start_tomorrow→timeline`, `trip_start_today→in_app`, `trip_last_day→memory`, `weather_attention_candidate→push`, `light_moment_candidate→editorial`. El label **MUST NOT** autorizar delivery ni contener texto/payload de Push/provider.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Mapping|cada uno de los cinco kinds|orquesta|obtiene exactamente su label|
|Kind desconocido|kind fuera del conjunto|ejecuta|silencio `invalid_selected_decision`|
|Frontera|acción conceptual|inspecciona|sin copy, destino ni autorización de envío|

### Requirement: Explicabilidad, observación y aislamiento

El resultado **MUST** ser `CompanionAction|CompanionSilence` y declarar razón, policy, referencia de decisión y gates evaluados; `nextUsefulAt` **MAY** existir sólo si es exacto. Razones cerradas: `preference_disabled|no_selected_decision|invalid_selected_decision|not_yet_valid|decision_expired|already_processed|invalid_history|frequency_limited|recent_high_action`. El observer **MUST** limitarse a `outcome`, reason, policy, priority, channel y duración sanitizada, omitiendo referencias, historial, evidencia, payload y errores crudos.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Explicación|acción o silencio|inspecciona|policy, referencia y gates verificables|
|Próximo exacto|cooldown calculable|silencia|incluye `nextUsefulAt` exacto|
|Próximo incierto|causa no temporal|silencia|omite `nextUsefulAt`|
|Observer seguro|resultado observado|emite|sólo categorías y duración sanitizada|
|Observer falla|callback lanza|ejecuta|resultado no cambia ni lanza|
|Sin I/O|cualquier input|ejecuta|sin red, storage ni provider|
|Límites legacy|módulo nuevo|analiza imports|sin Legacy Companion, Push, delivery, UI, IA ni engines previos|
|Compatibilidad|Companion legacy existente|incorpora módulo|comportamiento legacy no cambia|
