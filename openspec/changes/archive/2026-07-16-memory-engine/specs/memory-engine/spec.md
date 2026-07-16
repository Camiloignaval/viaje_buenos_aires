# Memory Engine Specification

## Purpose

Retain travel milestones privately without another log or store.

## Requirements

### Requirement: Closed inputs

The engine **MUST** accept only exact structures: `CompanionAction` (`outcome`, `actionId`, `decision`, `channel`, `policy`, `reason`, `decisionRef`, `evaluatedGates`) paired with `EditorialMessage` (`locale`, `catalogVersion`, `variantId`, `text`, `actionRef`, `channel`), or `{eventId, kind: "favorite_marked" | "chapter_opened", occurredAt, targetRef}`. Pair lineage/kind/channel **MUST** agree; extras/getters are forbidden.

#### Scenario: Correlated pair
- GIVEN a matching exact pair
- WHEN classified
- THEN one candidate returns

#### Scenario: Invalid shape
- GIVEN mismatch, extras, silence, observation, or error
- WHEN classified
- THEN `invalid_input` or `lineage_mismatch` is returned

### Requirement: V1 categories

The engine **MUST** retain only four authorized V1 meanings and **MUST NOT** infer others.

#### Scenario: Trip started
- GIVEN paired kind `trip_start_today`
- WHEN classified
- THEN type is `trip_started`

#### Scenario: Last day
- GIVEN paired kind `trip_last_day`
- WHEN classified
- THEN type is `trip_last_day`

#### Scenario: Favorite
- GIVEN an authorized `favorite_marked` event
- WHEN classified
- THEN type is `favorite_marked`

#### Scenario: First chapter
- GIVEN the first authorized `chapter_opened` event
- WHEN classified
- THEN type is `first_chapter_opened`

#### Scenario: Deferred or transient
- GIVEN trip tomorrow/end, note, important moment, weather, or light
- WHEN classified
- THEN `unsupported_kind` or `transient_context` is returned

### Requirement: Lifecycle

Candidates **MUST** be ephemeral; acceptance precedes storage; records **MUST** progress only `persisted` -> `remembered` -> `archived`. Confirmed retrieval marks remembered. Only an authorized request **MAY** archive; automatic archive is forbidden.

#### Scenario: Accepted lifecycle
- GIVEN an accepted candidate
- WHEN storage and confirmed retrieval succeed
- THEN states are `persisted`, then `remembered`

#### Scenario: No automatic archive
- GIVEN a remembered record without authorization
- WHEN time passes
- THEN it remains remembered

### Requirement: Safe explainable record

Records **MUST** contain `recordKind`, opaque `memoryKey`, type, origin, `occurredAt`, `createdAt`, owner, trip, nullable story/decision/editorial references, minimal evidence, coded meaning, state, and retention reason. They **MUST** explain what, why, when, and source.

#### Scenario: Explanation
- GIVEN a record
- WHEN its retention is inspected
- THEN meaning, reason, dates, origin, owner, trip, and story association are available

### Requirement: Ownership separation

Owner **MUST** come from authentication and trip membership. Trip **MUST** scope storage; story **MUST** be nullable association; only the engine **MAY** change lifecycle.

#### Scenario: Untrusted owner
- GIVEN payload ownership or non-membership
- WHEN retention is attempted
- THEN no candidate or record is produced

### Requirement: Privacy allowlist

The engine **MUST** reject/exclude email, tokens, coordinates, full payload/evidence, PII, notes/quotes, weather/transient context, observations, errors, and discarded decisions. Only curated editorial text and minimal authorized references **MAY** survive sanitization.

#### Scenario: Prohibited datum
- GIVEN otherwise valid input containing any prohibited datum
- WHEN processed
- THEN `privacy_rejected` is returned and the datum is absent from all outputs

### Requirement: Stable idempotence

Equivalent owner/trip/story/source meaning **MUST** yield one stable opaque identity. Repeated/concurrent equivalents **MUST** produce at most one record.

#### Scenario: Retry and concurrency
- GIVEN repeated or concurrent equivalent events
- WHEN stored
- THEN one succeeds and equivalents return `duplicate`

#### Scenario: Repeated chapter
- GIVEN a later chapter opening for the first-chapter slot
- WHEN classified
- THEN `not_first` is returned

### Requirement: Shared partitioned persistence

The port **MUST** reuse the authenticated, owner-scoped `memories` store/trip partition; no second store. Album/legacy readers/writers **MUST NOT** see or mutate semantic records.

#### Scenario: Partition isolation
- GIVEN album, legacy, and semantic records
- WHEN any reader or writer runs
- THEN it accesses only its authorized partition

### Requirement: Closed failures and boundaries

Discards **MUST** use only `invalid_input`, `lineage_mismatch`, `unsupported_kind`, `transient_context`, `not_first`, `duplicate`, or `privacy_rejected`. Failures **MUST** leave no partial record. The engine **MUST NOT** log, message, reevaluate context, query providers, or use AI.

#### Scenario: Repository failure
- GIVEN an accepted candidate and failing repository
- WHEN storage is attempted
- THEN no record, message, log, or retained error/input payload results
