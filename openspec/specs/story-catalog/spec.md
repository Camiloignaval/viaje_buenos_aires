# Story Catalog Specification

## Purpose

Define a real, extensible catalog of curated Story Packages (backend + client) so a second story can be added as content only, without touching `ExperiencePage` or other consuming code.

## Requirements

### Requirement: Catalog Resolves Any Registered Story by ID

The catalog MUST resolve a Story Package for any registered story id, not only a single hardcoded id.

#### Scenario: Existing story resolves

- GIVEN a story registered in the catalog under id `"ba-2026"`
- WHEN `getStory("ba-2026")` is called
- THEN the catalog MUST return that Story Package

#### Scenario: A second curated story requires no ExperiencePage change

- GIVEN a second curated story is registered in the catalog under a new id
- WHEN a trip resolves to that id
- THEN Experience MUST render it without any change to `ExperiencePage` code
- AND only catalog/content additions are required

### Requirement: Duplicate Identifiers Are Rejected

The catalog MUST validate uniqueness of story ids at registration time and MUST reject an attempt to register a duplicate id.

#### Scenario: Registering a duplicate id fails

- GIVEN a story already registered under id `"ba-2026"`
- WHEN a second story is registered under the same id `"ba-2026"`
- THEN the catalog MUST reject the registration with an explicit error
- AND the original story entry MUST remain unchanged

### Requirement: Unknown Identifiers Are Rejected Explicitly

The catalog MUST distinguish "id not found" from a crash or a silent fallback. Requesting a story id that does not exist MUST return an explicit not-found result, never a default story and never an unhandled exception.

#### Scenario: Unknown story id returns explicit not-found

- GIVEN a story id that is not registered in the catalog
- WHEN `getStory(unknownId)` is called
- THEN the catalog MUST return an explicit not-found result (e.g. null/404), not a crash
- AND it MUST NOT default to Buenos Aires or any other story
- AND it MUST NOT throw an unhandled exception

#### Scenario: Consumers surface not-found as an empty state, not an error

- GIVEN the catalog returns an explicit not-found result for a trip's `baseStoryId`
- WHEN the connected layer processes that result
- THEN it MUST expose an EMPTY content state (distinct from a technical ERROR state)
- AND downstream UI MUST route to the missing-story fallback, not a crash screen
