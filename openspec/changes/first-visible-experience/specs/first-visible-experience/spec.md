# First Visible Experience Specification

## Purpose

Define the approved active-trip-home moment.

## Requirements

### Requirement: Authorized visibility

The system MUST render only on the active-trip home for `composed` with one matching `pending/in_app` DeliveryIntent.

#### Scenario: Approved moment
- GIVEN an active-trip home and one matching pending in-app intent
- WHEN the composed result is represented
- THEN one moment shows EditorialMessage text unchanged
- AND accessible semantics identify non-urgent complementary content

#### Scenario: Wrong surface
- GIVEN the approved result outside the active-trip home
- WHEN represented
- THEN no moment appears

### Requirement: Fail closed

Every unapproved result MUST render no node, placeholder, shell, fallback, or error.

#### Scenario: Abstention
- GIVEN an abstained result
- WHEN represented
- THEN nothing renders

#### Scenario: Silence
- GIVEN Companion silence
- WHEN represented
- THEN nothing renders

#### Scenario: Discard
- GIVEN Memory discard
- WHEN represented
- THEN nothing renders

#### Scenario: Error
- GIVEN a pipeline error
- WHEN represented
- THEN nothing renders

#### Scenario: Missing intent
- GIVEN composed without intent
- WHEN represented
- THEN nothing renders

#### Scenario: Unsupported intent
- GIVEN an intent not both pending and in-app
- WHEN represented
- THEN nothing renders

#### Scenario: Multiple intents
- GIVEN composed with multiple intents
- WHEN represented
- THEN nothing renders

#### Scenario: Mismatch
- GIVEN the sole intent mismatches EditorialMessage
- WHEN represented
- THEN nothing renders

### Requirement: Editorial presentation

The system MUST show literal copy without mutation or UI rules. It MUST be discreet, non-blocking, and without modal, alert, system-notification, advertising semantics, or layout jump.

#### Scenario: Literal copy
- GIVEN approved visibility
- WHEN rendered
- THEN displayed copy equals EditorialMessage text
- AND page interaction remains available

### Requirement: Local dismissal

Dismissal MUST remove only the mounted representation and emit `dismiss` once. It MUST NOT mutate or reinvoke Memory, Decision, Companion, results, or storage.

#### Scenario: Keyboard close
- GIVEN a visible keyboard-focused close control
- WHEN activated twice
- THEN the moment disappears and one dismiss emits
- AND domain and storage state remain unchanged

### Requirement: Safe observation

Observation MAY emit only `flow_started`, `result_layer`, `render_success`, `dismiss`, or `silence`. It MUST exclude copy, IDs, trip, user, dates, payloads, PII, and raw errors. Observer failure MUST be harmless.

#### Scenario: Observed lifecycle
- GIVEN a successful visible flow
- WHEN rendered and dismissed
- THEN only allowed categories emit in lifecycle order

#### Scenario: Hostile observer
- GIVEN an observer throws or attempts mutation
- WHEN any flow resolves
- THEN visibility remains unchanged

### Requirement: Responsive accessibility

The moment MUST provide WCAG AA semantics and focus, hide decoration, avoid unnecessary live regions, and prevent fixed-width overflow.

#### Scenario: Viewports
- GIVEN mobile, tablet, and desktop viewports
- WHEN rendered
- THEN content remains within each viewport without fixed-width overflow

#### Scenario: Assistive access
- GIVEN a visible moment
- WHEN inspected by keyboard and assistive technology
- THEN close is named, focus visible, and decoration hidden
- AND no alert role or unnecessary `aria-live` exists

### Requirement: Reduced motion

The system MAY transition without changing layout, but MUST remove transition under reduced motion while preserving content and geometry.

#### Scenario: Motion reduced
- GIVEN reduced motion is requested
- WHEN the moment appears
- THEN it appears without transition and unchanged

### Requirement: Existing authority

Integration MAY call the existing composer with current trip/user data and caller-owned empty history. It MUST NOT claim durable dedupe or persistence, add rules, import the production simulator, invoke delivery, or modify engines or Story.

#### Scenario: Authorized inputs
- GIVEN current trip/user inputs and empty caller-owned history
- WHEN the active-trip flow starts
- THEN the composer runs without new rules or persistence

#### Scenario: Isolation
- GIVEN visible-experience code
- WHEN inspected
- THEN no simulator, Push, Web Push, timeline, email, SMS, engine-rule, or Story-rule dependency exists
