# Tasks: First Visible Experience

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 700-950 |
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
| 1 | Pure projection, presentational moment and CSS contracts | PR 1 base = feature/tracker branch |
| 2 | Application adapter and active-trip integration | PR 2 base = PR 1 branch |
| 3 | Consolidated scenario and protected-range proof | PR 3 base = PR 2 branch |

## Phase 1: Visible contract (Unit 1)

- [x] 1.1 **RED:** Create `app/src/features/experience/lib/visibleExperience.test.ts` for **Approved moment**, **Wrong surface**, **Abstention**, **Silence**, **Discard**, **Error**, **Missing intent**, **Unsupported intent**, **Multiple intents**, **Mismatch** and **Literal copy**.
- [x] 1.2 **GREEN:** Create `app/src/features/experience/lib/visibleExperience.ts` with the nullable frozen view model, exact intent/reference checks and categorical best-effort observer; never mutate copy, infer authority or expose private fields.
- [x] 1.3 **RED:** Create `app/src/features/experience/components/VisibleCompanionExperience.test.tsx` and CSS contract tests for **Keyboard close**, **Observed lifecycle**, **Hostile observer**, **Viewports**, **Assistive access** and **Motion reduced**.
- [x] 1.4 **GREEN→REFACTOR:** Add `app/src/features/experience/components/VisibleCompanionExperience.tsx` and scoped rules in `app/src/styles/shell.css`: in-flow aside, literal copy, local one-shot dismiss, 44px control, visible focus, hidden decoration, fluid width and reduced-motion override.

## Phase 2: Production seam (Unit 2)

- [ ] 2.1 **RED:** Create `app/src/features/experience/hooks/useFirstVisibleExperience.test.ts` for **Authorized inputs**, settled fail-closed behavior, one logical instant, empty caller-owned sets/history and no durable dedupe/storage claim.
- [ ] 2.2 **GREEN:** Create `app/src/features/experience/hooks/useFirstVisibleExperience.ts`; map current trip/user/story/preferences into `composeFirstRealExperience`, project its result, and never invoke simulator, delivery or lower-layer rules directly.
- [ ] 2.3 **RED:** Extend `app/src/features/trips/components/ActiveTripHome.test.tsx` and `app/src/features/trips/pages/TripHomePage.test.tsx` for active-home-only placement, silent fallback, unchanged CTA interaction and the real five-engine composer path.
- [ ] 2.4 **GREEN→REFACTOR:** Add a `ReactNode` slot to `app/src/features/trips/components/ActiveTripHome.tsx` and minimal hook/moment composition in `app/src/features/trips/pages/TripHomePage.tsx`; preserve existing preparations when silent and avoid new route/provider/loading authority.

## Phase 3: Consolidated safety (Unit 3)

- [ ] 3.1 **RED→GREEN:** Add `app/src/features/experience/visibleExperience.boundaries.test.ts` for **Isolation**: forbid simulator production imports, Push/Web Push, timeline, email/SMS, storage, delivery, network, Story/engine rules and component access to domain inputs.
- [ ] 3.2 **TRIANGULATE→REFACTOR:** Map all 19 scenarios to named assertions; run `npm --prefix app run test:react -- --run src/features/experience/lib/visibleExperience.test.ts src/features/experience/components/VisibleCompanionExperience.test.tsx src/features/experience/hooks/useFirstVisibleExperience.test.ts src/features/experience/visibleExperience.boundaries.test.ts src/features/trips/components/ActiveTripHome.test.tsx src/features/trips/pages/TripHomePage.test.tsx`, `npm --prefix app run test:react`, `npm --prefix app test`, `npm --prefix app run typecheck`, `git diff --check`, and `git diff --name-only 0159bc17cf4d628c8e4d6540aa2031244ff1bfaa..HEAD -- app/src/features/context-engine app/src/story app/src/features/experience/firstRealExperience.ts app/src/features/experience/firstRealExperience.test.ts app/src/features/dev/firstRealExperienceSimulator.ts app/src/features/dev/firstRealExperienceSimulator.test.ts app/src/app/router.tsx app/api app/lib`; additionally inspect production route diffs so only intended `TripHomePage.tsx` and `ActiveTripHome.tsx` integration changes. Never build or run Playwright.
