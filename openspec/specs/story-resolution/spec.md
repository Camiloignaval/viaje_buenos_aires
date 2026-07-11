# Story Resolution Specification

## Purpose

Define how the system resolves the correct Story Package for a given trip through a single canonical identifier, replacing the static hardcoded story currently imported by `ExperiencePage`.

## Requirements

### Requirement: Canonical Trip-to-Story Identifier

The system MUST use `baseStoryId` as the single source of truth governing the trip→story relationship. Trip, Connected layer, and Experience MUST all resolve the story from the same `baseStoryId` value; no other field (e.g. `storyPackageId`) MAY influence resolution.

#### Scenario: Resolution uses only the canonical identifier

- GIVEN a trip with `baseStoryId: "ba-2026"`
- WHEN the connected layer resolves the trip's story
- THEN it MUST request the story by `baseStoryId` value only
- AND no other trip field MUST be consulted to determine which story to load

#### Scenario: Legacy dead field is ignored

- GIVEN a persisted trip with a non-null `storyPackageId` value alongside `baseStoryId`
- WHEN resolving the trip's story
- THEN `storyPackageId` MUST be ignored entirely
- AND resolution MUST proceed using `baseStoryId` alone

### Requirement: Experience Consumes the Connected Layer

`ExperiencePage` MUST resolve the trip's Story Package through the connected layer (`useConnectedTrip` + story content resolution) and MUST NOT depend on any statically imported Story Package.

#### Scenario: Different trips render their own story

- GIVEN two trips, A with `baseStoryId: "ba-2026"` and B with `baseStoryId: "story-x"` (both present in the catalog)
- WHEN each trip's Experience is opened
- THEN Experience for A MUST render the "ba-2026" package and Experience for B MUST render the "story-x" package
- AND neither MUST render the other's content

#### Scenario: No static story import remains

- GIVEN the `ExperiencePage` module
- WHEN its dependencies are inspected
- THEN it MUST NOT import a hardcoded Story Package (e.g. `auroraStoryPackage`) directly

#### Scenario: Progress, memories, and photos key off the canonical identifier

- GIVEN a trip resolved to `baseStoryId: X`
- WHEN progress, memories, or photos are read or written for that trip
- THEN they MUST be keyed by `X`
- AND MUST NOT be keyed by a fixed/hardcoded story id

### Requirement: Resolution In-Flight State

While the connected layer is loading the trip or its story, Experience MUST show a loading state and MUST NOT render stale or incorrect content.

#### Scenario: Loading before resolution completes

- GIVEN a trip and story query still in flight
- WHEN the user has `/experience?tripId=X` open
- THEN Experience MUST show a loading state
- AND MUST NOT render any Story Package until resolution completes

### Requirement: Technical Failure Is Not a Missing-Story State

Failures while loading the trip or story (network/API errors, or a Story Package failing schema validation) are real technical errors — the system MUST surface an error state distinguishable from "no story exists" and MUST NOT silently present it as the honest missing-story fallback.

#### Scenario: Connected layer network/API failure (technical error)

- GIVEN the connected layer fails to load the trip or story due to a network or API error (not a 404/not-found)
- WHEN Experience attempts to resolve the story
- THEN it MUST show a technical error state, not the honest "sin historia" fallback
- AND the error MUST be available for logging/retry, not swallowed silently

#### Scenario: Story Package fails schema validation (technical error)

- GIVEN a resolved Story Package that fails schema validation
- WHEN Experience attempts to render it
- THEN it MUST show a technical error state
- AND MUST NOT render partial or malformed content
- AND MUST NOT be treated as "trip sin historia curada"
