# Delta for Living Context Health

## ADDED Requirements

### Requirement: Diagnósticos locales del manifiesto de decisiones

El Health Check **MAY** validar un manifiesto sanitizado de reglas y **MUST** detectar ids duplicados, capabilities o reasonCodes desconocidos, metadata incompatible, ventanas inválidas, dedupe ausente y expiración requerida ausente. **MUST** ser puro, determinista y no mayor que `warning`.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Id duplicado|dos reglas comparten id|valida|warning estable identifica ambos paths|
|Capability desconocida|regla exige capability no contractual|valida|warning estable identifica el path|
|Reason desconocida|regla declara reasonCode no cerrado|valida|warning estable identifica el path|
|Ventana inválida|`validUntil` no supera `validFrom`|valida|warning estable identifica la ventana|
|Dedupe/expiración ausente|acción deduplicable o temporal carece contrato requerido|valida|warnings estables identifican campos|
|Contrato válido|ids, gates, reasons, ventanas, dedupe y expiración son válidos|valida|no emite warnings de decisiones|
|Metadata incompatible|regla Weather/Light carece metadata estructurada requerida|valida|warning sin inferir desde texto libre|
|Legacy|Story o instalación no declara manifiesto|valida|permanece válida y sin critical|
|Weather ausente|capability/provider Weather no existe|valida|ausencia es no crítica|

## MODIFIED Requirements

### Requirement: Salida segura y límites

Los diagnósticos **MUST** ser verificables sin ids runtime, dedupe keys, PII, coordenadas exactas, presupuesto, tokens ni payloads de proveedor. Esta capability **MUST NOT** agregar IA, Companion, notificaciones, UI, segundo engine/resolver ni backend monolítico, y **MUST NOT** ejecutar requests Weather ni reglas de decisión.

(Previously: la salida segura no cubría artefactos del Decision Engine ni prohibía evaluar sus reglas.)

#### Scenario: Valor sensible inválido
- GIVEN metadata o manifiesto inválido con datos sensibles
- WHEN se genera el diagnóstico
- THEN código y path describen el problema
- AND ningún valor sensible, id runtime ni dedupe key aparece

#### Scenario: Proveedor no configurado
- GIVEN que no existe provider Weather configurado
- WHEN se ejecuta el Health Check
- THEN no consulta servicios externos ni reglas
- AND su ausencia es como máximo no crítica
