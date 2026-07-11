# Trip Story Navigation Specification

## Purpose

Define the navigation flow from creating a trip to entering its Experience: the user MUST always land on their own trip's Portada/Home first, and entry into the cinematic Experience MUST always be a voluntary action — never an automatic jump, and never to the wrong story.

## Requirements

### Requirement: Post-Creation Flow Lands on the Trip's Own Portada

After `StoryBeginning` completes, the user MUST land on the Portada/Home of the trip just created, not on the general trips list.

#### Scenario: Trip creation returns to its own Portada

- GIVEN a user completes the wizard and `StoryBeginning` finishes creating the trip
- WHEN the transition completes
- THEN the user MUST be taken to the Portada/Home of that specific trip
- AND MUST NOT be redirected to the general trips list

### Requirement: Entering Experience Is a Voluntary User Action

Navigation from the Portada into the cinematic Experience (Cover → Experience) MUST require an explicit user action; it MUST NOT happen automatically.

#### Scenario: User must act to enter the Experience

- GIVEN a trip's Portada is displayed with an "Entrar al viaje" action
- WHEN the Portada renders
- THEN Experience MUST NOT open automatically
- AND Experience MUST only open after the user activates the entry action

#### Scenario: Entry always resolves to that trip's own story

- GIVEN the user activates the entry action on trip T with `baseStoryId: X`
- WHEN Experience opens
- THEN it MUST resolve and render the story for `X`
- AND MUST NEVER open a different trip's story or a default story

### Requirement: Direct URL Access Never Bypasses Resolution Guards

Navigating directly to `/experience?tripId=` MUST go through the same resolution rules as the normal flow — it MUST NOT open an incorrect Experience, and a nonexistent trip MUST NOT be treated as a technical crash.

#### Scenario: Direct URL to a nonexistent trip (honest state, not a technical error)

- GIVEN a `tripId` in the URL that does not exist or is not accessible to the user
- WHEN `/experience?tripId=` is opened directly
- THEN the system MUST show an honest not-found state
- AND MUST NOT render any Story Package
- AND MUST NOT crash or default to Buenos Aires

#### Scenario: Direct URL never causes automatic navigation elsewhere

- GIVEN a valid `tripId` whose story is still resolving
- WHEN `/experience?tripId=` is opened directly
- THEN the system MUST show the loading state in place
- AND MUST NOT auto-redirect to the general trips list
