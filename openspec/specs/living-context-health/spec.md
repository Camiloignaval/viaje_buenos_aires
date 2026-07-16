# Living Context Health Specification

## Qué revisar primero

El Health Check protege metadata curada sin convertir extensiones futuras ni stories legacy en fallas críticas.

## Purpose

Definir diagnósticos verificables para metadata de living context incompleta o incoherente.

## Requirements

### Requirement: Compatibilidad legacy

El Health Check **MUST** aceptar stories anteriores que no declaren metadata de living context. Esa ausencia **MUST NOT** producir severidad `critical`, invalidar la Story ni cambiar su contenido; **MAY** producir un diagnóstico `info` o `warning` accionable.

#### Scenario: Story legacy válida
- GIVEN una Story válida previa a living context sin metadata nueva
- WHEN se ejecuta el Health Check
- THEN la Story conserva su resultado válido
- AND no se emite ningún diagnóstico `critical` por esa ausencia

#### Scenario: Metadata parcial opcional
- GIVEN una Story legacy con solo parte de la metadata nueva
- WHEN se ejecuta el Health Check
- THEN cada ausencia se reporta como máximo como `warning`
- AND el diagnóstico identifica el campo sin inventar un valor

### Requirement: Metadata curada incompleta

Cuando una Story opta explícitamente por metadata de living context, el Health Check **MUST** detectar campos curados requeridos ausentes o vacíos y emitir un diagnóstico determinístico con código, path y severidad no mayor que `warning`.

#### Scenario: Campo curado vacío
- GIVEN una Story con living context declarado y un campo curado vacío
- WHEN se ejecuta el Health Check
- THEN se emite un warning con código y path estables
- AND la Story no es reescrita

#### Scenario: Metadata completa
- GIVEN una Story con metadata curada completa
- WHEN se ejecuta el Health Check
- THEN no se emiten warnings de completitud de living context

### Requirement: Coherencia de identidad y contexto

El Health Check **MUST** advertir incoherencias verificables entre `storyId`, `baseStoryId`, destino, locale o timezone declarados, preservando los valores originales y la precedencia del Trip en runtime. **MUST NOT** tratar datos dinámicos futuros ausentes como error editorial.

#### Scenario: Identificadores narrativos incoherentes
- GIVEN una Story con relación inválida entre `storyId` y `baseStoryId`
- WHEN se ejecuta el Health Check
- THEN se emite un warning específico para ambos paths
- AND ninguno de los ids se corrige automáticamente

#### Scenario: Destino y timezone incoherentes
- GIVEN metadata curada cuya timezone contradice su destino conocido
- WHEN se ejecuta el Health Check
- THEN se emite un warning reproducible de coherencia

#### Scenario: Dato dinámico ausente
- GIVEN una Story sin clima, eventos, transporte o alertas futuras
- WHEN se ejecuta el Health Check
- THEN no se emite `critical`
- AND la ausencia no invalida metadata curada existente

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

### Requirement: Salida segura y límites

Los diagnósticos **MUST** ser verificables sin ids runtime, dedupe keys, PII, coordenadas exactas, presupuesto, tokens ni payloads de proveedor. Esta capability **MUST NOT** agregar IA, Companion, notificaciones, UI, segundo engine/resolver ni backend monolítico, y **MUST NOT** ejecutar requests Weather ni reglas de decisión.

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

### Requirement: Diagnósticos Weather opcionales y locales

El Health Check **MAY** diagnosticar timezone ausente o inválida, provider no configurado y respuesta Weather incompleta o inválida. Los diagnósticos **MUST** ser determinísticos, sanitizados y no mayores que `warning`; ausencia de provider **MUST NOT** invalidar Stories legacy ni producir `critical`. El Health Check **MUST NOT** consultar servicios externos.

#### Scenario: Story legacy sin Weather
- GIVEN una Story legacy válida y provider Weather ausente
- WHEN se ejecuta el Health Check
- THEN la Story conserva su resultado válido
- AND no se emite ningún diagnóstico `critical`

#### Scenario: Timezone inválida
- GIVEN metadata optativa Weather con timezone inválida
- WHEN se ejecuta el Health Check
- THEN se emite un warning con código y path estables
- AND no se inventa ni corrige la timezone

#### Scenario: Respuesta runtime inválida
- GIVEN un diagnóstico runtime local de payload Weather incompleto o inválido
- WHEN se integra al Health Check
- THEN se emite como máximo un warning sanitizado
- AND no incluye coordenadas, PII, tokens ni payload crudo

#### Scenario: Provider saludable
- GIVEN timezone válida, provider configurado y snapshot normalizado válido
- WHEN se ejecutan diagnósticos locales
- THEN no se emiten warnings Weather
