# Missing Story Fallback Specification

## Purpose

Define the honest, non-destructive behavior when a trip has no curated Story Package available: the user MUST remain on their own trip's Portada/Home with a clear, well-designed state — never a generic invented story, never a silent fallback to Buenos Aires, and never an incorrect Experience.

## Requirements

### Requirement: Trip Without a Story Assignment Shows an Honest Empty State

A trip whose `baseStoryId` is null/absent MUST keep the user on that trip's Portada/Home with an explicit "story not ready yet" state — product-level honesty, not a technical error.

#### Scenario: Newly created trip with no baseStoryId (honest state)

- GIVEN a trip just created with `baseStoryId: null`
- WHEN the user views that trip's Portada
- THEN the Portada MUST show an explicit "tu historia todavía no está lista" state
- AND MUST NOT redirect into Experience
- AND MUST NOT default to the Buenos Aires story

### Requirement: Unresolvable Story Identifier Never Opens the Wrong Experience

A trip whose `baseStoryId` is set but does not exist in the catalog (corrupt or inconsistent data) MUST be treated the same as having no story: the user stays on the Portada with the honest empty state — this is a product-level state, not a technical error to retry.

#### Scenario: baseStoryId points to a nonexistent catalog entry (honest state)

- GIVEN a trip with `baseStoryId: "unknown-id"` not present in the catalog
- WHEN the user views that trip's Portada or attempts to enter Experience
- THEN the system MUST show the honest "historia no disponible" state on the Portada
- AND MUST NOT open any Experience
- AND MUST NOT fall back silently to the Buenos Aires story

#### Scenario: Direct URL access to a trip without a resolvable story

- GIVEN a trip T with no resolvable `baseStoryId` (null or unknown)
- WHEN `/experience?tripId=T` is opened directly
- THEN the system MUST route the user to T's Portada with the honest empty state
- AND MUST NOT render any Experience content

### Requirement: Legacy/Inconsistent Trips Normalize to an Honest State

Trips created before this change, with inconsistent combinations of `baseStoryId`/`storyPackageId`, MUST be normalized using `baseStoryId` as the only signal; if it is unresolvable, the trip falls into the same honest empty state — never a crash, never a silent BA default.

#### Scenario: Legacy trip with inconsistent fields

- GIVEN a legacy trip where `storyPackageId` is set but `baseStoryId` is null or unresolvable
- WHEN the trip's story is resolved
- THEN the system MUST rely on `baseStoryId` only
- AND MUST show the honest empty state, since no legacy field may substitute for it
