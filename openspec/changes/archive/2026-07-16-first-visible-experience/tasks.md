# Tasks: First Visible Experience

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 850-1150 |
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
| 4 | Receipt contract and lifecycle | PR 4 base = feature/tracker branch |
| 5 | Session continuity integration | PR 5 base = PR 4 branch |
| 6 | Real-pipeline closure proof | PR 6 base = PR 5 branch |

## Historical delivery: visible experience

- [x] 1.1 **RED:** Test projection outcomes and literal copy in `features/experience/lib/visibleExperience.test.ts`.
- [x] 1.2 **GREEN:** Implement frozen fail-closed projection and categorical observer in `features/experience/lib/visibleExperience.ts`.
- [x] 1.3 **RED:** Test component lifecycle, access, viewports and motion in `features/experience/components/VisibleCompanionExperience.test.tsx`.
- [x] 1.4 **GREEN→REFACTOR:** Implement the in-flow moment and scoped CSS without domain authority.
- [x] 2.1 **RED:** Test authorized snapshots and single composition in `features/experience/hooks/useFirstVisibleExperience.test.ts`.
- [x] 2.2 **GREEN:** Implement the hook over the real composer with empty caller-owned continuity inputs.
- [x] 2.3 **RED:** Test active-home placement, silence, CTA and real integration in trip component/page tests.
- [x] 2.4 **GREEN→REFACTOR:** Wire the moment into `ActiveTripHome.tsx` and `TripHomePage.tsx`.
- [x] 3.1 **RED→GREEN:** Enforce production isolation in `features/experience/visibleExperience.boundaries.test.ts`.
- [x] 3.2 **TRIANGULATE→REFACTOR:** Verify the original 19 scenarios, full suites, typecheck and protected ranges.

## Phase 4: Session receipt foundation (Unit 4)

- [x] 4.1 **RED:** Create `features/experience/lib/visibleDeliverySession.test.ts` for **Valid record**, **Storage failure**, scope isolation, exact allowlist, corruption/version rejection and lazy expiry without timers.
- [x] 4.2 **RED:** Add lifecycle assertions for **Legal lifecycle**, **Illegal transition** and **Pending retry**; pending never enters dedupe/history and transitions are idempotent or fail closed.
- [x] 4.3 **GREEN→REFACTOR:** Implement `visibleDeliverySession.ts`: probed `sessionStorage`, versioned scoped identity, earliest-boundary expiry, immutable receipts and visible-only Companion snapshot.

## Phase 5: Session continuity integration (Unit 5)

- [x] 5.1 **RED:** Extend hook/page remount tests for **Same-trip continuity**, **Scope switch** and **History projection** across rerender, navigation, return and tab reload; cover user/trip switching and unavailable storage silence.
- [x] 5.2 **GREEN:** Update `useFirstVisibleExperience.ts` and `TripHomePage.tsx` to load caller-owned processed keys/history, persist pending, and expose visible/dismiss callbacks keyed by user+trip.
- [x] 5.3 **GREEN→REFACTOR:** Update `VisibleCompanionExperience.tsx` and observer allowlist for **Observation**; commit visible before display, dismiss once without engine invocation, and keep hostile observers harmless.

## Phase 6: Consolidated closure (Unit 6)

- [x] 6.1 **RED→GREEN:** Prove **Today is visible**, **Existing non-in-app outcomes** and **Rejected result** with the real today/tomorrow/last-day/silence pipeline; verify suppressed receipts create no node or animation.
- [x] 6.2 **TRIANGULATE:** Extend UI/boundary tests for **Access and viewports**, **Reduced or suppressed** and **Dependencies**; preserve JSX/CSS unless an objective defect fails a test.
- [x] 6.3 **REFACTOR→VERIFY:** Run focal React tests, `npm --prefix app run test:react`, `npm --prefix app test`, `npm --prefix app run typecheck`, `git diff --check`, and protected-range/name-only checks for engines, Story, composer, simulator, router, API and durable storage. Never build or run Playwright.
