# Tasks: First Real Experience

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 650-900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Review boundary |
|---|---|---|
| 1 | Contracts, composer and real-engine E2E | PR 1 base = feature/tracker branch |
| 2 | Observer, simulator and boundary proof | PR 2 base = PR 1 branch |
| 3 | Consolidated safety evidence | PR 3 base = PR 2 branch |

## Alignment Guard

The specification governs terminal behavior: abstention, silence, Memory discard and error produce zero `DeliveryIntent`s. This resolves the conflicting design sentence that retains an editorial intent after Memory discard. The five engines and production entrypoints remain byte-unchanged.

## Phase 1: Pure composition (Unit 1)

- [x] 1.1 **RED:** Create `app/src/features/experience/firstRealExperience.test.ts` with real-engine failures for **Primer día local exitoso**, **Valores finales inmutables**, **Lineage exitoso**, **Intent exitoso** and **Trace exitoso**.
- [x] 1.2 **GREEN:** Create `app/src/features/experience/firstRealExperience.ts` with closed frozen result/trace/intent contracts and the single-instant `settled` pipeline; pass each authoritative output unchanged and stop at `MemoryCandidate`.
- [x] 1.3 **TRIANGULATE:** Extend the same test for **Abstención de Decision**, **Silencio de Companion**, **Descarte de Memory**, **Resultado terminal**, **Trace terminal**, **Contexto no settled**, **Error de dependencia** and **Lineage inválido**; assert zero later calls, intents and raw errors.
- [x] 1.4 **REFACTOR:** Keep only observer injection, categorical allowlists and shared deep-freeze helpers in `firstRealExperience.ts`; run `npm run test:react -- --run src/features/experience/firstRealExperience.test.ts`.

## Phase 2: Internal evidence (Unit 2)

- [x] 2.1 **RED:** Create `app/src/features/dev/firstRealExperienceSimulator.test.ts` for **Fixture repetible**, hostile-observer equivalence, exact five-stage snapshot and absence of network, storage, UI or ambient clock.
- [x] 2.2 **GREEN:** Create `app/src/features/dev/firstRealExperienceSimulator.ts` with only the canonical fixed fixture and `simulateFirstRealExperience()`; expose no route, React component, delivery or persistence.
- [x] 2.3 **TRIANGULATE→REFACTOR:** Add static assertions for **Ausencia productiva** and **Prueba byte-unchanged**: no simulator production import and no I/O, UI, providers, AI, Story, lifecycle/repository or new rule; run both focal Vitest files and `git diff --check`.

## Phase 3: Consolidated safety (Unit 3)

- [x] 3.1 **RED→GREEN:** Map all 16 scenarios above to named assertions and add missing negative cases only in the two new test files; no engine mocks, snapshots hiding fields or weakened contracts.
- [x] 3.2 **TRIANGULATE→REFACTOR:** Run `npm run test:react`, `npm test`, `npm run typecheck`, existing Living/Decision/Companion/Editorial/Memory safety tests, `git diff --check`, and a baseline range diff proving the five engine trees and production entrypoints byte-unchanged; do not build.
