# Tasks: Companion Orchestrator

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 850-1,150 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 3 autonomous local work units |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Review boundary |
|---|---|---|
| 1 | Contracts, pure gates, output and explainability | PR 1 base = feature/tracker |
| 2 | Dedupe, history, named frequency policy and channels | PR 2 base = PR 1 |
| 3 | Safe observer, negative boundaries and full safety | PR 3 base = PR 2 |

Apply as rollback-safe thematic commits on `etapa-7-living-context`; tests stay with behavior. No PR branches or push.

## Phase 1: Contracts and pure orchestration

- [x] 1.1 **RED** - Create `app/src/features/context-engine/companion/orchestrator.test.ts` mapping: Determinismo, Inmutabilidad, Sin seleccion, Preferencia, Act unica, No Act, Malformada, Preserva, Futura, Inicio exacto, Fin exacto, Expiry exacto, Ventana invalida, Explicacion, Proximo incierto.
- [x] 1.2 **GREEN** - Create `companion/{contracts,orchestrator,index}.ts`; consume only `selected`, capture injected clock once, preserve a deeply frozen Act, and return closed action/silence with ordered gates and exact `nextUsefulAt` rules.
- [x] 1.3 **REFACTOR** - Keep contracts minimal and pure; verify work unit 1 tests and commit behavior plus tests together.

## Phase 2: History, frequency and channels

- [x] 2.1 **RED** - Create `companion/policy.test.ts` mapping: Procesada, Historica, Vacio, Inseguro, Normal/low reciente, Seis horas, High temprana, High limite, High reciente, High dedupe/vencida, Proximo exacto, Mapping, Kind desconocido, Frontera.
- [x] 2.2 **GREEN** - Create `companion/policy.ts`; validate caller-owned history before dedupe, then apply `CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS`: 6h default, distinct high at `>=60m`, and no high aged `<60m`; never bypass invalidity, expiry or dedupe.
- [x] 2.3 **GREEN** - Map exactly: `trip_start_tomorrow->timeline`, `trip_start_today->in_app`, `trip_last_day->memory`, `weather_attention_candidate->push`, `light_moment_candidate->editorial`; labels MUST NOT authorize delivery.
- [x] 2.4 **REFACTOR** - Name temporal boundaries, use no scores, verify work unit 2 tests, and commit behavior plus tests together.

## Phase 3: Observer and isolation

- [x] 3.1 **RED** - Create `companion/observer.test.ts` for Observer seguro and Observer falla; create `companion/boundaries.test.ts` for Sin I/O, Limites legacy and Compatibilidad.
- [x] 3.2 **GREEN** - Create `companion/observer.ts`; emit only outcome, closed reason, policy, priority/channel categories and finite duration capped at 60s; swallow observer failure without changing output.
- [x] 3.3 **REFACTOR** - Prove imports exclude React, providers, storage, Push/delivery, UI, IA, legacy and prior-engine mutation; run focal/full React safety, typecheck and diff-check, never build.
- [x] 3.4 Preserve archive order Foundation -> Weather -> Decision -> Orchestrator; do not archive, activate a consumer, persist history, modify preferences/config/endpoints, or advance to 7.5.
