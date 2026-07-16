# Proposal: Context Decision Engine

## Intent

**Hoy**, Living Context normaliza cinco módulos, pero no resuelve qué situación merece atención. **Propuesto**: una capa TypeScript pura y determinista que seleccione como máximo una acción semántica y conserve la traza completa, sin activar entrega.

## Scope

### In Scope
- Contrato `Act | Abstain`, una `selected` opcional y evaluaciones completas e inmutables.
- Reglas nombradas y ordenadas: inicio mañana/hoy, último día, candidato Weather y candidato Light.
- Prioridad cerrada, conflictos, dedupe, vigencia local, freshness, explainability, observer seguro y Health Check puro.
- Input explícito: Living Context normalizado, `tripId`, preferencias, keys procesadas, candidatos de actividad y reloj.

### Out of Scope
- Companion, delivery, UI, copy, IA, endpoints, persistencia, configuración, scores/confidence o registry genérico.
- Inferir inteligencia desde texto libre, reordenar itinerarios o implementar `returned`/`week-after`.

## Capabilities

### New Capabilities
- `context-decision-engine`: evaluación determinista, selección, abstención, prioridad, conflictos, dedupe, vigencia, explainability y observabilidad.

### Modified Capabilities
- `living-context-health`: validación local y opcional de un manifiesto sanitizado de reglas, sin requests ni impacto legacy.

## Approach

Crear `context-engine/decision/` sin framework dinámico. Evaluar todas las reglas en orden estable; marcar procesadas, colapsar `dedupeKey`, aislar conflictos por categoría y seleccionar por prioridad/orden. Temporal puede aceptar estado recién derivado para el reloj actual aunque su provenance sea stale; Weather exige `available`, fresh, no expirado y coherente. Con Story productivo actual, Weather/Light deben abstenerse: solo fixtures con metadata curada y ventanas estructuradas pueden actuar.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `app/src/features/context-engine/decision/` | New | Contratos, cinco reglas, evaluator y observer |
| `app/src/features/story/health/` | Modified | Checker opcional del manifiesto |
| `app/lib/companionEngine.js` | Unchanged | Frontera futura; comportamiento intacto |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Actuar con Weather stale o metadata inferida | Medium | Gates estrictos y abstención por defecto |
| Cambio >400 líneas por tests | High | Work units y estrategia chained antes de apply |
| Dependencias OpenSpec activas | Medium | Archivar Foundation → Weather → Decision Engine |

## Rollback Plan

Eliminar el subdominio y checker opcional; ningún consumidor, dato persistido ni Companion depende de ellos.

## Dependencies

- Contratos activos `living-context-foundation` y `living-context-weather`; archive en ese orden antes de este cambio.

## Success Criteria

- [ ] Mismos inputs y reloj producen idéntica selección y traza ordenada.
- [ ] Las cinco reglas cubren Act/Abstain, preferencias, dedupe, conflictos y expiración; nunca se selecciona más de una acción.
- [ ] Weather/Light se abstienen con Story real y actúan solo con fixtures curados válidos; fallas Financial/Weather permanecen aisladas.
- [ ] Observer y Health Check no exponen ids, keys, payloads, PII ni ejecutan I/O.
