# Tasks: Editorial Voice

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900-1,200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Unit 1 -> Unit 2 -> Unit 3, local commits |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Boundary |
|---|---|---|
| 1 | Contracts, catalog, validation | local commit 1; conceptual PR #1 base = feature/tracker |
| 2 | Hash, rendering, typed failures | local commit 2; conceptual PR #2 base = PR #1 |
| 3 | Observer and isolation safety | local commit 3; conceptual PR #3 base = PR #2 |

## Unit 1: Contracts, catalog and validation

- [x] 1.1 **RED:** Create `contracts.test.ts`, `catalog.test.ts`, `validation.test.ts` and `boundaries.test.ts` for scenarios **Cobertura cinco kinds, Límite inclusivo, Exceso exacto, Vacío, Prohibido normalizado, Fixture editorial, Placeholder rechazado, Catálogo inválido, Entrada editorial inválida**.
- [x] 1.2 **GREEN:** Add `contracts.ts`, `catalog.ts`, `validation.ts`: exact fields `{locale,catalogVersion,variantId,text,actionRef,channel}`; errors `INVALID_CATALOG`, `INVALID_LOCALE`, `MISSING_KIND`, `DUPLICATE_VARIANT_ID`, `INVALID_TEXT`, `TEXT_TOO_LONG`, `FORBIDDEN_TEXT`, `PLACEHOLDER_NOT_ALLOWED`; Unicode 160/161, tone and zero placeholders.
- [x] 1.3 Freeze these exact fixtures: `tomorrow-01` “Mañana comienza este viaje.”; `tomorrow-02` “Falta poco: el viaje empieza mañana.”; `today-01` “Hoy comienza una nueva historia.”; `today-02` “El viaje empieza hoy, a su propio ritmo.”; `last-day-01` “Hoy es el último día de este viaje.”; `last-day-02` “Este viaje llega hoy a su último día.”; `weather-01` “Quizás sea un buen momento para considerar el clima.”; `weather-02` “El clima puede ser relevante para este momento del viaje.”; `light-01` “Puede ser un buen momento para disfrutar la luz natural.”; `light-02` “La luz natural acompaña este momento del viaje.”
- [x] 1.4 **REFACTOR:** Centralize closed catalogs/allowlists; preserve immutable public contracts and rerun Unit 1 tests.

## Unit 2: Deterministic rendering and failures

- [ ] 2.1 **RED:** Create `hash.test.ts` and `editorialVoice.test.ts` for **Determinismo exacto, Inmutabilidad profunda, Sin fallback, Kind no soportado, Seed estable, Variación alcanzable, Versión identitaria, IDs ocultos, Contrato exacto, Canal conceptual, Sin interpolación, Input inválido, Canal inválido**.
- [ ] 2.2 **GREEN:** Add `hash.ts`, `editorialVoice.ts`, `index.ts`; implement UTF-8 FNV-1a, strict validation order, deep freeze, preservation of action reference/channel, and `EditorialContractError` codes `INVALID_ACTION`, `UNSUPPORTED_KIND`, `INVALID_CHANNEL` plus all Unit 1 codes.
- [ ] 2.3 **REFACTOR:** Remove incidental fallback/state and keep behavior/catalog/tests in this rollback-safe local commit.

## Unit 3: Observation and dependency safety

- [ ] 3.1 **RED:** Add `observer.test.ts` and full fixtures/static boundary checks for **Frontera aislada, Observer seguro, Observer falla**, plus regression coverage for all 25 scenarios.
- [ ] 3.2 **GREEN:** Add `observer.ts`; emit only categorical fields and sanitized duration, preserve original output/error, and forbid AI, context, Story, providers, decisions runtime, React/UI, Push/delivery, storage and legacy Companion dependencies.
- [ ] 3.3 **REFACTOR:** Consolidate exports/fixtures and run focal editorial, React safety, Node safety, typecheck and diff-check; do not build, integrate, push, archive or start 7.6.

Archive order: Foundation -> Weather -> Decision -> Orchestrator -> Editorial.
