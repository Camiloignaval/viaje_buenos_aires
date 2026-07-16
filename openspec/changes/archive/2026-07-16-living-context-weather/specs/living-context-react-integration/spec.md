# Delta for Living Context React Integration

## ADDED Requirements

### Requirement: Consulta Weather compartida

La integración React **MUST** iniciar Weather únicamente con elegibilidad resuelta desde Trip y **MUST** compartir una query key estable por identidad del recurso. **MUST NOT** duplicar consultas Trip/Story, reglas de ventana, timezone, normalization, cache o fallback.

#### Scenario: Dos consumidores elegibles
- GIVEN dos consumidores con el mismo Trip en curso y hoy local
- WHEN ambos solicitan living context
- THEN comparten una única consulta Weather activa
- AND no crean requests adicionales de Trip ni Story

#### Scenario: Trip no elegible
- GIVEN un Trip fuera de curso o fuera de hoy local
- WHEN React compone living context
- THEN Weather no habilita su query
- AND se realizan cero requests Weather

#### Scenario: Weather pendiente o fallido
- GIVEN los módulos Foundation disponibles y Weather pendiente o fallido
- WHEN se consume el snapshot
- THEN Foundation se entrega sin bloqueo
- AND Weather refleja su estado parcial

## MODIFIED Requirements

### Requirement: Límites de la capability

La integración **MUST NOT** agregar UI, IA, Companion, notificaciones, un segundo engine, otro resolver ni un endpoint agregador monolítico. **MUST NOT** alterar copy editorial de Etapa 6. **MAY** consumir la query Weather compartida, pero **MUST NOT** crear feature flags, placeholders ni providers futuros.

(Previously: React prohibía proveedores reales y cualquier módulo externo sin adapter o cache.)

#### Scenario: Módulo futuro no soportado
- GIVEN una capability externa sin adapter ni datos cacheados
- WHEN React compone el snapshot
- THEN la capability se declara no disponible
- AND no se crea UI, notificación ni request implícito

#### Scenario: Weather soportado sin UI
- GIVEN Weather disponible en la query compartida
- WHEN React compone el snapshot
- THEN entrega Weather al resolver existente
- AND no crea UI, Companion, IA ni notificaciones
