# Tasks: Adaptive Journey & Living Memories

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,800-2,600 |
| Delivery strategy | auto-chain |
| Suggested split | Five slices |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

## Suggested Work Units

| Unit | Goal / base boundary | Commit |
|---|---|---|
| 1 | Story/composition; base tracker | `feat(experience): add adaptive contextual moments` |
| 2 | Weather; base Unit 1 | `feat(context): gate productive weather context` |
| 3 | Memory API; base Unit 2 | `feat(memory): surface semantic living memories` |
| 4 | UI/receipts; base Unit 3 | `feat(experience): integrate productive companion consumers` |
| 5 | Integration; base Unit 4 | `test(experience): verify adaptive journey and memory flows` |

## Phase 1: Story evidence and composition

- [ ] 1.1 **RED:** Add exact/unsafe Story and authoritative-selection tests in `features/story/{engine,health}` and `features/experience/firstRealExperience.test.ts` (S01-S04,S13,S25).
- [ ] 1.2 **GREEN:** Extend `engine/types.ts`, `health/healthCheck.ts`, `story-ba2026.json`; add pure `experience/lib/adaptiveJourney.ts` using official context and transient Weather/Light after `MemoryDiscard`.
- [ ] 1.3 **TRIANGULATE:** Extend `firstRealExperience.ts` and `visibleDeliverySession.ts` references while keeping today/receipts compatible.
- [ ] 1.4 **REFACTOR:** Prove rules/mappings/catalog/Memory core unchanged; persist progress; commit Unit 1.

## Phase 2: Weather gate and productive query

- [ ] 2.1 **RED:** Cover disabled/membership/trip zero-call routes and fresh/stale/error/Financial isolation in `routes/context/weather.test.js` and `weatherContext{Client,Query}.test.ts` (S06-S09,S24).
- [ ] 2.2 **GREEN:** Add default-false `ENABLE_WEATHER_PROVIDER` in `platformConfig.js`; validate membership/trip before provider in `routes/context/weather.js`.
- [ ] 2.3 **TRIANGULATE:** Wire trip-scoped client/query and `hooks/useAdaptiveJourney.ts` with stable identity and unavailable degradation.
- [ ] 2.4 **REFACTOR:** Verify gate off and no provider/rule added; persist progress; commit Unit 2.

## Phase 3: Semantic Memory API

- [ ] 3.1 **RED:** Test latest/read, concurrency, ownership and legacy separation in `platformMemory.test.js` and new semantic route tests (S16-S19).
- [ ] 3.2 **GREEN:** Extend `platformMemory.js`; add authenticated `routes/trips/[tripId]/semantic-memories.js` GET/POST and `apiRoutes.js` mapping.
- [ ] 3.3 **TRIANGULATE:** Add exact DTO client/query in `experience/api/semanticMemoryApi.ts`; persist idempotently outside render.
- [ ] 3.4 **REFACTOR:** Prove allowlist/member scope and failure isolation; persist progress; commit Unit 3.

## Phase 4: Adaptive UI, receipts and hierarchy

- [ ] 4.1 **RED:** Test Weather/Light slot, Last Day, Album memory, receipts, observer and silence in `experience/**/*.test.tsx` (S05,S10-S12,S14-S15,S20-S23).
- [ ] 4.2 **GREEN:** Add `LivingMemoryMoment.tsx`; wire one chapter slot/one `TripAlbum` memory through `Modes.tsx` and `VisibleCompanionExperience.tsx`.
- [ ] 4.3 **TRIANGULATE:** Complete Last Day persistence, receipt hierarchy, privacy observer, a11y/responsive/reduced-motion/PWA CSS.
- [ ] 4.4 **REFACTOR:** Enforce literal Editorial copy, one protagonist and `null` silence; persist progress; commit Unit 4.

## Phase 5: Integration and visual verification

- [ ] 5.1 **RED:** Add real Weather/Light/Last-Day/memory/silence fixtures and dev-only states; audit S01-S25 without bypass.
- [ ] 5.2 **GREEN:** Run focal tests, explicit route tests, full Node/React suites, typecheck, protected-range checks and `git diff --check`; never build.
- [ ] 5.3 **TRIANGULATE:** Run all eight Playwright projects, reduced-motion and mobile/tablet/desktop/WebKit/PWA inspection when environment permits; report harness failures, no skips.
- [ ] 5.4 **REFACTOR:** Remove test leakage, preserve trip-sharing/unrelated files, persist 25/25 evidence; commit Unit 5 and leave archive pending.
