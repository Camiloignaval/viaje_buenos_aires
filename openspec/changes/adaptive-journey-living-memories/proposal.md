# Proposal: Adaptive Journey & Living Memories

## Intent

**Decisión propuesta:** cerrar una capacidad productiva que represente Weather/Light en el capítulo activo y un recuerdo semántico en el álbum, coordinando autoridades existentes. Hoy faltan metadata Story estructurada, gate/membership Weather, delivery transitorio y API Memory member-scoped.

## Scope

### In Scope

- Adaptador exacto y aditivo de metadata Story; nunca inferir desde texto libre.
- Evolución del compositor existente: Weather/Light pueden producir delivery editorial-only `in_app` aunque Memory conserve `transient_context`; hoy permanece igual y último día continúa `memory`-only.
- Query Weather con ownership y `ENABLE_WEATHER_PROVIDER=false`; cero requests deshabilitado. Dev/test requieren activación o mocks; producción queda off hasta aprobación comercial/atribución.
- API semántica autenticada sobre `platformMemory`/Mongo existentes: read DTO exacto `{type,text}`, write idempotente y aislamiento legacy.
- Una ranura Weather/Light en el capítulo y un recuerdo read-only en `TripAlbum`.
- Receipts, jerarquía, observer, consumidor y QA PWA/a11y/responsive/visual.

### Out of Scope

- Nuevos engines, capas, providers, reglas, mappings, catálogo, copy o inferencia directa en UI.
- Scheduler, Push, timeline, dashboard, IA, geofencing, nueva persistencia o mezcla legacy.

## Capabilities

### New Capabilities

- `adaptive-journey-living-memories`: composición, representación y persistencia segura de momentos y recuerdos.

### Modified Capabilities

None. Las capacidades canónicas conservan sus reglas normativas.

## Approach

Cinco slices auto-chain: (1) Story; (2) Weather; (3) compositor/delivery; (4) Memory/álbum; (5) consumidor/UI/QA. Decision, Companion, Editorial y Memory core conservan autoridad; la UI sólo proyecta resultados autorizados.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `app/src/story/` | Modified | Schema, metadata y health checks. |
| `app/src/features/experience/` | Modified/New | Composición, receipts y UI. |
| `app/api/context/`, `app/lib/platformConfig.js` | Modified | Gate/membership Weather. |
| `app/routes/trips/`, `app/lib/platformMemory.js` | Modified/New | API Memory scopeada. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Regresión de autoridades | Medium | Contratos cerrados y TDD. |
| Fuga de ownership | Medium | Membership, DTO allowlisted e índices existentes. |
| Weather no aprobado | High | Flag off por defecto y cero provider requests. |
| Review excesivo | High | Cinco slices auto-chain autónomos. |

## Rollback Plan

Revertir slices en orden inverso y mantener Weather off. Al retirar consumidor/rutas aditivas, motores, álbum legacy y “hoy” conservan su baseline.

## Dependencies

Specs: `living-context-weather`, `context-decision-engine`, `companion-orchestrator`, `editorial-voice`, `memory-engine`, `first-real-experience`, `first-visible-experience`, `story-resolution`, `trip-story-navigation`.

## Success Criteria

- [ ] Weather/Light se muestran sólo con metadata, membership, freshness e intent autorizados; disabled/silence produce cero UI/request.
- [ ] Hoy no cambia; último día persiste sin momento contextual.
- [ ] Memory API sólo devuelve `{type,text}`, es idempotente/member-scoped y muestra máximo un recuerdo.
- [ ] Cinco slices pasan TDD, suites, typecheck, rutas, QA PWA/a11y/responsive/visual y `git diff --check`, sin build.
