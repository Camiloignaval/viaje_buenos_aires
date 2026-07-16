# Delta for Living Context Health

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Salida segura y límites

Los diagnósticos **MUST** ser verificables sin PII, coordenadas exactas, presupuesto, tokens ni payloads de proveedor. Esta capability **MUST NOT** agregar IA, Companion, notificaciones, UI, segundo engine/resolver ni backend monolítico, y **MUST NOT** ejecutar requests Weather.

(Previously: la salida segura excluía PII y coordenadas y asumía que no existía integración con proveedor real.)

#### Scenario: Valor sensible inválido
- GIVEN metadata inválida que contiene datos sensibles
- WHEN se genera el diagnóstico
- THEN código y path describen el problema
- AND ningún valor sensible aparece en el mensaje

#### Scenario: Proveedor no configurado
- GIVEN que no existe provider Weather configurado
- WHEN se ejecuta el Health Check
- THEN no se intenta consultar servicios externos
- AND su ausencia es como máximo no crítica
