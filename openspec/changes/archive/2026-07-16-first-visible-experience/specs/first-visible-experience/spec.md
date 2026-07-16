# First Visible Experience Specification

## Requirements

### Requirement: Authorized visibility
The system MUST show literal EditorialMessage copy only for one matching `pending/in_app` intent on active-trip home. Otherwise it MUST render nothing.

#### Scenario: Today is visible
- GIVEN real today produces the approved intent
- WHEN represented on active-trip home
- THEN one complementary moment appears

#### Scenario: Existing non-in-app outcomes
- GIVEN real tomorrow/last-day preserves its outcome/destination
- WHEN represented
- THEN nothing renders

#### Scenario: Rejected result
- GIVEN Companion silence, another terminal, wrong surface, or missing, multiple, unsupported, or mismatched intent
- WHEN represented
- THEN nothing renders

### Requirement: Delivery lifecycle
The system MUST allow exactly `pending -> visible -> dismissed`, `pending -> expired`, and `visible|dismissed -> expired`; it MUST NOT deliver remotely. Expiry MUST use the earliest existing trip/action boundary and be ignored or lazily cleaned without cron. Dismissal MUST change only its receipt/UI, emit once, and cause no domain effects.

#### Scenario: Legal lifecycle
- GIVEN an approved pending receipt
- WHEN it visibly commits, is dismissed, or crosses expiry
- THEN only the applicable transition occurs once

#### Scenario: Illegal transition
- GIVEN any receipt
- WHEN another transition is attempted
- THEN it fails closed without delivery

### Requirement: Session continuity and identity
Receipts MUST survive rerender, navigation, return, and reload in one tab session. Identity MUST include user, trip, action, and destination. Cross-tab/browser continuity MUST NOT be promised.

#### Scenario: Same-trip continuity
- GIVEN a visible or dismissed receipt
- WHEN rerendering, leaving and returning, or reloading its tab
- THEN the moment remains hidden

#### Scenario: Pending retry
- GIVEN a never-visible pending receipt
- WHEN revisited before expiry
- THEN visibility MAY complete

#### Scenario: Scope switch
- GIVEN receipts exist across trips or users
- WHEN trip or authentication changes and later returns
- THEN only that user-trip lifecycle is restored

### Requirement: Safe session storage
Only existing session storage MAY hold a versioned allowlist of categorical receipt data. Copy, PII, payloads, raw errors, local storage, IndexedDB, and remote state MUST NOT be stored.

#### Scenario: Valid record
- GIVEN an allowlisted current-version record
- WHEN loaded
- THEN only verified categorical data is accepted

#### Scenario: Storage failure
- GIVEN corrupt, unavailable, quota-, read-, or write-failing storage
- WHEN evaluated
- THEN silence results without exception

### Requirement: Companion authority
Only receipts proven visible, including later dismissed/expired, MUST feed caller-owned processed keys/history. Pending, silence, error, and never-rendered results MUST NOT. Existing Companion dedupe/frequency MUST remain sole authority.

#### Scenario: History projection
- GIVEN visible and never-visible receipts
- WHEN Companion inputs form
- THEN only visible receipts supply dedupe keys and visible times

### Requirement: Safe observation
Observation MAY cover only categorical pending, visible, dismissed, expired, and silence outcomes. It MUST exclude content, identity, time, payload, PII, and raw errors; observer failure MUST be harmless.

#### Scenario: Observation
- GIVEN a lifecycle and a hostile observer
- WHEN events emit
- THEN allowed categories remain ordered and behavior unchanged

### Requirement: Accessible responsive presentation
The moment MUST be discreet, non-blocking, named, WCAG-AA operable, fluid, overflow-safe, decoration-hidden, and free of alert/live-region semantics.

#### Scenario: Access and viewports
- GIVEN any supported viewport or assistive access
- WHEN visible
- THEN named close, visible focus, safe layout, and page interaction remain

### Requirement: Motion
Animation MAY avoid layout change, but MUST stop under reduced motion and MUST NOT restart for a suppressed rehydrated receipt.

#### Scenario: Reduced or suppressed
- GIVEN reduced motion or suppressed rehydration
- WHEN the route renders
- THEN no transition runs and geometry remains

### Requirement: Architectural isolation
Integration MUST NOT add rules, channels, providers, engines, Story logic, simulator imports, Push, Timeline, email, SMS, delivery execution, or durable persistence.

#### Scenario: Dependencies
- GIVEN visible-experience code
- WHEN inspected
- THEN only existing authorities and ephemeral session receipts remain
