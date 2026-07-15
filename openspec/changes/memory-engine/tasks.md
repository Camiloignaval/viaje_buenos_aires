# Tasks: Memory Engine

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,200-1,700 |
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
| 1 | Pure contracts, policy, privacy, identity and lifecycle | local commit 1; conceptual PR #1 base = feature/tracker |
| 2 | Authenticated Mongo adapter and partition guards | local commit 2; conceptual PR #2 base = PR #1 |
| 3 | Observer, isolation and complete safety proof | local commit 3; conceptual PR #3 base = PR #2 |

## Unit 1: Pure semantic core

- [x] 1.1 **RED:** Add `memory/{contracts,validation,policy}.test.ts` for **Correlated pair, Invalid shape, Trip started, Last day, Favorite, First chapter, Deferred or transient, Untrusted owner, Prohibited datum**. Verify: `npm run test:react -- src/features/context-engine/memory`.
- [x] 1.2 **GREEN:** Add `memory/{contracts,validation,policy}.ts`; make every 1.1 scenario pass with exact immutable inputs/results and closed privacy/lineage rules. Verify: `npm run test:react -- src/features/context-engine/memory`.
- [x] 1.3 **TRIANGULATE:** Add `memory/{dedupe,lifecycle}.test.ts` for **Accepted lifecycle, No automatic archive, Explanation, Repeated chapter**, SHA-256 fixtures and illegal transitions. Verify: `npm run test:react -- src/features/context-engine/memory`.
- [x] 1.4 **REFACTOR:** Add `memory/{dedupe,lifecycle,index}.ts`; centralize schemas, clone/freeze and versioned identity for all Unit 1 scenarios without upstream imports. Verify: `npm run test:react -- src/features/context-engine/memory`; `npm run typecheck`.

## Unit 2: Shared authenticated persistence

- [x] 2.1 **RED:** Add `lib/platformMemory.test.js` for **Retry and concurrency, Repository failure, Untrusted owner**: membership, atomic uniqueness, duplicate, confirmed read and no partial write. Verify: `node --test lib/platformMemory.test.js`.
- [x] 2.2 **GREEN:** Add `lib/platformMemory.js` over `memories`; satisfy 2.1 through session owner, membership, discriminator, reserved `legacyId`, schema/lifecycle guards and atomic idempotency. Verify: `node --test lib/platformMemory.test.js`.
- [x] 2.3 **TRIANGULATE:** Extend sync tests and add route tests for **Partition isolation** across trip sync and legacy read/update/delete/write. Verify: `node --test lib/platformMemory.test.js lib/platformSync.test.js routes/memories.test.js "routes/memories/[id].test.js" "routes/trips/[tripId]/sync.test.js"`.
- [x] 2.4 **REFACTOR:** Modify `lib/platformSync.js`, trip sync and both legacy routes; centralize partition guards for all Unit 2 scenarios without changing Album semantics. Verify: `npm test`.

## Unit 3: Observation and isolation proof

- [ ] 3.1 **RED:** Add `memory/{observer,boundaries}.test.ts` for **Invalid shape, Prohibited datum, Repository failure**: safe outcomes, observer failure, forbidden imports and unchanged upstream. Verify: `npm run test:react -- src/features/context-engine/memory`.
- [ ] 3.2 **GREEN:** Add `memory/observer.ts`; satisfy 3.1 with best-effort categorical telemetry that preserves discard/error and retains no input. Verify: `npm run test:react -- src/features/context-engine/memory`.
- [ ] 3.3 **TRIANGULATE:** Execute all 16 named scenarios, prohibited-data table, concurrency and all four meanings; preserve Companion/Editorial safety. Verify: `npm run test:react -- src/features/context-engine/memory src/features/context-engine/companion src/features/context-engine/editorial`.
- [ ] 3.4 **REFACTOR:** Consolidate fixtures/exports, prove full Node/React/type safety and clean diff. Verify: `npm test`; `npm run test:react`; `npm run typecheck`; `git diff --check`. Never build.

Archive remains pending; do not integrate consumers, push, tag or modify prior stages.
