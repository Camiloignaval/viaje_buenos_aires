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

### Requirement: Salida segura y límites

Los diagnósticos **MUST** ser verificables sin PII ni coordenadas exactas. Esta capability **MUST NOT** agregar IA, Companion, notificaciones, UI, proveedores reales, un segundo engine ni un backend monolítico.

#### Scenario: Valor sensible inválido
- GIVEN metadata inválida que contiene PII o coordenadas exactas
- WHEN se genera el diagnóstico
- THEN código y path describen el problema
- AND el valor sensible no aparece en el mensaje

#### Scenario: Proveedor no configurado
- GIVEN que no existe integración con un proveedor real
- WHEN se ejecuta el Health Check
- THEN no se intenta consultar servicios externos
- AND el resultado depende solo de metadata local
