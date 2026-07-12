# Tasks: Resolución de historia por catálogo (story-catalog-resolution)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~750-950 (≈20 archivos, backend + cliente + tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 → PR4 → PR5 (1:1 con las fases) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main — cada fase se mergea directo a main a medida que pasa, sin rama feature/tracker intermedia |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Fase 1 — catálogo backend + limpieza canónica | PR 1 | Aditivo; BA sigue resolviendo. Base: main |
| 2 | Fase 2+3 — tipado cliente + `useExperience(storyPackage, scopeId)` | PR 2 | `scopeId` con default backward-compatible. Base: PR 1 |
| 3 | Fase 4 — `useResolvedStory` + `ExperiencePage` + `ExperienceUnavailable` (fix núcleo) | PR 3 | El bug raíz se cierra acá. Base: PR 2 |
| 4 | Fase 5 — navegación (Portada, ruta, wizard, `ActiveTripHome`) | PR 4 | Base: PR 3 |
| 5 | Fase 6 — cierre/fixtures + suite completa | PR 5 | Base: PR 4 |

---

## Fase 1: Backend catálogo + limpieza canónica

- [x] 1.1 `platformStories.js`: reemplazar `cachedBaseStoryPackage`/URL única por `BASE_STORY_REGISTRY` (mapa `storyId→{packageUrl}`) + cache `Map<storyId, StoryPackage>` (story-catalog)
- [x] 1.2 `platformStories.js`: `listBaseStories()` itera el registro; `getBaseStory(storyId)` hace lookup, `null` si no existe (story-catalog: "Catalog Resolves Any Registered Story")
- [x] 1.3 `platformStories.js`: guard `assertUniqueStoryIds(registry)` al cargar el módulo — lanza si hay claves repetidas (story-catalog: "Duplicate Identifiers Are Rejected")
- [x] 1.4 Test (`npm run test`) en `platformStories.test.js`: registrar una segunda entrada falsa en `BASE_STORY_REGISTRY` (test-local) y verificar que resuelve **sin tocar `ExperiencePage`** — cierra punto 8.2
- [x] 1.5 Test en `platformStories.test.js`: id desconocido → `null` explícito, sin excepción, sin default a BA — cierra punto 8.4 (story-catalog: "Unknown Identifiers")
- [x] 1.6 Test en `platformStories.test.js`: registrar id duplicado lanza error explícito; la entrada original no cambia
- [x] 1.7 `platformTrips.js`: `deriveBaseStoryId` → tabla `DESTINATION_STORY_MAP` (primer match gana, sin match → `null`); validar que cada `storyId` de la tabla exista en `BASE_STORY_REGISTRY`
- [x] 1.8 `platformTrips.js`: `createTripDocument` deja de escribir `storyPackageId: null` (story-resolution: "Legacy dead field is ignored")
- [x] 1.9 Test en `platformTrips.test.js`: BA sigue resolviendo `ba-2026`; destino sin match → `baseStoryId: null`; `createTripDocument` ya no incluye `storyPackageId`
- [x] 1.10 Validación: `npm run test`

## Fase 2: Tipado cliente

- [x] 2.1 `app/src/features/connected/types.ts`: agregar `ConnectedStory.storyPackage?: StoryPackage` (importar type de `@/features/story/engine/types`)
- [x] 2.2 Validación: `npm run typecheck`

## Fase 3: `useExperience(storyPackage, scopeId)`

- [x] 3.1 `useExperience.ts`: agregar segundo parámetro `scopeId = storyPackage.storyId` (default); re-keyear `themeStorageKey`, `introSeenKey`, `progressStore`, `memoryStore`, `photoStore`, `syncNow`/`saveSyncToken` por `scopeId` (`storyId` queda solo para `getStoryView`) (story-resolution: "Progress, memories, and photos key off the canonical identifier")
- [x] 3.2 Test (`test:react`) de `useExperience`: progreso/recuerdos/fotos quedan keyeados por `scopeId`, no por `storyPackage.storyId` fijo
- [x] 3.3 Test de integración: la intro cinematográfica (`Cover.tsx`/`IntroIndexStage`, `introSeenKey`) dispara correctamente al cambiar de `scopeId` entre trips, sin quedar "pegada" al key fijo anterior — cierra punto 8.6
- [x] 3.4 Validación: `npm run typecheck && npm run test:react`

## Fase 4: `useResolvedStory` + `ExperiencePage` + `ExperienceUnavailable` (fix núcleo)

- [x] 4.1 Crear `app/src/features/experience/hooks/useResolvedStory.ts` — compone `useTripId`+`useConnectedTrip`+`useStoryContent`, sin red propia, devuelve **6 estados** `local|loading|ready|empty|not-found|error`; `not-found` se deriva DIRECTO del `status` crudo de `useConnectedTrip` (`TripContextStatus.NOT_FOUND`), NUNCA de `useStoryContent`/`combineReadiness` (colapsan NOT_FOUND→ERROR) (design D8)
- [x] 4.2 Crear `app/src/features/experience/components/ExperienceUnavailable.tsx` — estado honesto con enlace de vuelta a la Portada; acepta prop `variant: "empty" | "not-found"` (mecanismo, no copy final)
- [x] 4.3 `ExperiencePage.tsx`: eliminar `import { auroraStoryPackage }` y `useExperience(auroraStoryPackage)`; switch sobre `useResolvedStory` (story-resolution: "Experience Consumes the Connected Layer")
- [x] 4.4 Test `useResolvedStory.test.tsx` — cobertura de los **6** `kind` (local/loading/ready/empty/not-found/error); caso explícito que confirma que `not-found` y `empty` son estados DISTINTOS y no se colapsan entre sí ni con `error`
- [x] 4.5 Test integración: trip real con `baseStoryId: "ba-2026"` → Experience renderiza el StoryPackage BA real vía `useResolvedStory`, no el import estático — cierra punto 8.1
- [x] 4.6 Test integración: trip `baseStoryId: null` → acceso directo por URL → `ExperienceUnavailable` variant `empty`, nunca BA — cierra punto 8.3 (missing-story-fallback)
- [x] 4.7 Test integración: `baseStoryId` presente pero inexistente en catálogo → mismo tratamiento honesto que "sin historia" (`kind: empty`), nunca crash ni BA — cierra punto 8.4 (missing-story-fallback: "Unresolvable Story Identifier")
- [x] 4.8 Test integración: trip inexistente/no accesible (`getTrip` 404/403) vía URL directa `/experience?tripId=<id-inexistente>` → `useConnectedTrip` = `NOT_FOUND` → `ExperienceUnavailable` variant `not-found`, NUNCA el mismo tratamiento silencioso que un error técnico (`kind:error`) ni un crash (design D8, trip-story-navigation: "honest not-found state")
- [x] 4.9 Test explícito de blindaje (no dar por hecho el borrado del import): (a) lectura del código fuente de `ExperiencePage.tsx` en el test para confirmar ausencia de referencia a `auroraStoryPackage` fuera de `kind:"local"`; (b) test de comportamiento con dos trips de `baseStoryId` distintos que confirma que ninguno renderiza BA por defecto — cierra punto 8.7 (story-resolution: "No static story import remains")
- [x] 4.10 Validación: `npm run test:react` + E2E manual del trip BA real

## Fase 5: Navegación

- [x] 5.1 Crear `app/src/features/trips/pages/TripHomePage.tsx` (`/trips/:tripId`) — RESOLVED → CTA "Entrar al viaje"; EMPTY → estado honesto sin CTA (trip-story-navigation, missing-story-fallback)
- [x] 5.2 Crear `TripHomePage.test.tsx` — cobertura READY/EMPTY
- [x] 5.3 `tripUrl.ts`: agregar `tripHomeUrl(id) = /trips/:id`
- [x] 5.4 `router.tsx`: ruta `/trips/:tripId` (RequireAuth+RequireOnboarding, lazy `TripHomePage`); verificar que no capture `/trips`
- [x] 5.5 `ActiveTripHome.tsx`: `<a href>` → navegación SPA (`useNavigate`/`Link`); CTA story-aware (solo si story RESOLVED)
- [x] 5.6 `TripsPage.tsx`: el card de trip activo enlaza a la Portada (`tripHomeUrl`), no directo a Experience
- [x] 5.7 `CreateTripWizard.tsx`/`StoryBeginning.tsx`: `handleStorySuccess(trip)` deja de llamar `onDone()`; navega SPA a `/trips/${trip.id}` (trip-story-navigation: "Post-Creation Flow Lands on the Trip's Own Portada")
- [x] 5.8 Actualizar `ActiveTripHome.test.tsx`: envolver en router; assert de navegación SPA (no hard nav) + CTA story-aware
- [x] 5.9 Actualizar `StoryBeginning.test.tsx`/test del wizard: mockear `useNavigate`; assert de navegación a `/trips/:tripId`, NO llama `onDone` (lista general), sin `<a href>` — cierra punto 8.5
- [x] 5.10 Validación: `npm run test:react` + `npm run test:e2e`

## Fase 6: Cierre y fixtures

- [x] 6.1 Estrechar `auroraStory.ts` — uso limitado al branch `kind:"local"` (sin tocar el JSON)
- [~] 6.2 Revisar `StatesGallery.tsx` (dev-only, opcional) — NO se agregó estado de Portada (depende de hooks de router/red; no encaja en la galería de props fijas). Solo se ajustó el uso del wizard (`onDone` eliminado). Opcional, omitida a propósito.
- [x] 6.3 Confirmar `TripEntry.test.tsx`/`initialDestination.test.ts` — sin cambio salvo que toquen el enlace de `ActiveTripHome`
- [x] 6.4 Validación pre-merge completa: `npm run typecheck && npm run test && npm run test:react && npm run build`

---

## Riesgo conocido diferido (no bloqueante)

- **Sync token (Épica 5):** `syncNow` re-keyea al pasar el scope a `tripId` (Fase 3); el backend `api/aurora/*` no está validado en vivo. Diferido, fuera de alcance de este checklist — no bloquea ninguna tarea ni `sdd-apply` (design.md §10).

## Out of Scope (recordatorio — ninguna tarea de arriba debe tocarlos)

- `User` y `TripMember` (modelo multi-miembro)
- `Timeline Engine`
- Story Engine dinámico / motor de perfilado
- Generación de contenido con IA
- Nuevas historias curadas (solo dejar el catálogo listo)
- Cambios de motion/animación ajenos a este desacople
