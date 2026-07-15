# Tasks: Context Decision Engine

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,200-1,700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 4 autonomous review slices |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Review boundary |
|---|---|---|
| 1 | Contracts + deterministic engine | PR 1 base = feature/tracker |
| 2 | Temporal rules | PR 2 base = PR 1 |
| 3 | Weather + Light | PR 3 base = PR 2 |
| 4 | Health + safety nets | PR 4 base = PR 3 |

Apply uses these as local thematic commits on `etapa-7-living-context`; no PR branch or push.

## Phase 1: Contracts + deterministic engine

- [x] 1.1 **RED** — Create `app/src/features/context-engine/decision/engine.test.ts`: Determinismo, Inmutabilidad, Reloj, Orden, Actúa, Abstiene, Múltiples, Conflicto, Dedupe, Ventana, Expiración; Capability, Preferencia, Insuficiente, Inválida, Parcial, Conflictiva, Procesado, Prioridad, Coexistencia, Equivalencia, Entrega.
- [x] 1.2 **GREEN** — Create `decision/{contracts,constants,time,rules,engine,observer,index}.ts`; implement immutable `Act|Abstain`, complete ordered trace, processed keys, conflict/dedupe/expiry and one selection.
- [x] 1.3 **REFACTOR** — Freeze the explicit rule order, stable dedupe identities and sanitized observer contract; keep behavior/tests together in local slice 1.

## Phase 2: Temporal rules

- [x] 2.1 **RED** — Create `decision/temporalRules.test.ts`: Inicio mañana, Inicio hoy, Durante, Ya iniciado, Timezone, DST, Duplicado, Último día, Día anterior, Finalizado, Fechas incompletas, Un día.
- [x] 2.2 **GREEN** — Implement tomorrow/today/last-day in `decision/rules.ts` using injected clock, destination IANA day, derived-temporal policy and local-day expiry.
- [x] 2.3 **REFACTOR** — Share only proven time helpers; preserve single-day precedence and local slice 2 rollback.

## Phase 3: Weather + Light

- [ ] 3.1 **RED** — Create `decision/weatherLightRules.test.ts`: Lluvia outdoor, Indoor, Stale, Unavailable, Sin metadata, Señal débil, Fuera ventana, Inexistente, Contradicción, Financial aislado, Weather aislado, Luz válida, Luz sin metadata, Luz stale, Luz pasada, Texto libre.
- [ ] 3.2 **GREEN** — Implement fresh/coherent Weather and Light-window rules in `decision/rules.ts`; require curated candidates, isolate partial failures and abstain on production Story metadata.
- [ ] 3.3 **REFACTOR** — Centralize named thresholds/intersections without provider imports; keep local slice 3 autonomous.

## Phase 4: Health + abstention boundaries

- [ ] 4.1 **RED** — Extend `decision/engine.test.ts`: Explicación, Observer, Fronteras, Alcance.
- [ ] 4.2 **RED** — Create `app/src/features/story/health/decisionManifestCheck.test.ts`: Id duplicado, Capability desconocida, Reason desconocida, Ventana inválida, Dedupe/expiración ausente, Contrato válido, Metadata incompatible, Legacy, Weather ausente, Valor sensible inválido, Proveedor no configurado.
- [ ] 4.3 **GREEN** — Create `decisionManifestCheck.ts` and extend `health/{types,healthCheck}.ts` optionally; produce stable warning-only safe paths, no I/O or rule execution.
- [ ] 4.4 **REFACTOR** — Confirm no Companion/Editorial copy/Memory persistence, UI, delivery, IA, geofencing, Experience, endpoints or production activation; keep tests with local slice 4.
- [ ] 4.5 Preserve docs as a separate planning commit; archive only Foundation → Weather → Decision after authorization, and do not advance to 7.4.
