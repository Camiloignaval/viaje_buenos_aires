# Proposal: Resolución de historia por catálogo (story-catalog-resolution)

## Intent

Bug raíz: `ExperiencePage.tsx` ignora la capa `connected` e importa fijo `auroraStoryPackage` (JSON estático), pasándolo a `useExperience(auroraStoryPackage)`. El `storyId` queda fijo y clava progreso/recuerdos/fotos (`progressStore`/`memoryStore`/`photoStore`) a esa clave, sin importar qué trip abrió el usuario → **cualquier trip renderiza siempre Buenos Aires**. Además `storyPackageId` en Mongo es campo muerto (siempre `null`) y coexiste con `baseStoryId` sin fuente de verdad única. Agregar una segunda historia hoy exige reescribir código en dos lugares (brecha ya documentada en `CURRENT_PROJECT_ANALYSIS.md`).

## Scope

### In Scope (Alternativa C3 "Puente + catálogo real")
- Conectar `ExperiencePage` a la capa `connected` existente (`useConnectedTrip` + `useStoryContent`) en vez del import estático.
- Unificar `baseStoryId`/`storyPackageId` en un único **identificador canónico** como fuente de verdad trip→historia.
- Dejar el catálogo (`platformStories`, endpoints, `getStory`) listo para una segunda historia curada como trabajo de contenido, no de ingeniería.
- **Fallback honesto**: trip sin historia curada permanece en la Portada/Home de SU viaje con estado bien diseñado; nunca abre una Experience incorrecta ni cae a Buenos Aires.
- Nuevo flujo: Wizard → StoryBeginning → Portada/Home del viaje creado → entrada voluntaria → intro cinematográfica (reusa `Cover.tsx`) → Experience de la historia real.
- Atar progreso/recuerdos/fotos al identificador canónico del trip.

### Out of Scope (no-goals explícitos)
- `User` y `TripMember` (modelo multi-miembro).
- `Timeline Engine`.
- Story Engine dinámico / motor de perfilado.
- Generación de contenido con IA.
- Nuevas historias curadas (solo dejar el catálogo listo).
- Cambios de motion/animación ajenos a este desacople.

## Capabilities

### New Capabilities
- `story-resolution`: resolver el StoryPackage correcto del trip desde el identificador canónico vía capa `connected`; eliminar el import estático de `ExperiencePage`.
- `story-catalog`: catálogo de historias base (backend + cliente) extensible a una segunda historia sin ingeniería.
- `trip-story-navigation`: flujo StoryBeginning → Portada → entrada voluntaria → Cover → Experience, sin navegación automática a historia equivocada.
- `missing-story-fallback`: estado honesto para trips sin historia curada, sin caída silenciosa a Buenos Aires.

### Modified Capabilities
- None (no existen specs OpenSpec previas).

## Approach

- Identificador canónico único como contrato trip↔historia; el backend deja de persistir el `storyPackageId` muerto.
- `ExperiencePage` consume `useConnectedTrip`/`useStoryContent` y deriva el storyId real del trip.
- Catálogo real en `platformStories`/endpoints; `getStory` resuelve por ID.
- Estados de resolución: LOADING / RESOLVED (Experience real) / EMPTY (fallback honesto en Portada).
- Navegación SPA reactiva (sin hard navigation), respetando la entrada voluntaria.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `experience` | Modified | Consume `connected` en vez del import estático |
| `connected` | Modified | Resolución de historia y fallback |
| `trips` | Modified | Identificador canónico y flujo StoryBeginning→Portada |
| backend `platformTrips` | Modified | Unificar identificador, eliminar campo muerto |
| backend `platformStories` | Modified | Catálogo real extensible |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Romper el viaje BA actual en la transición | Med | Mantener `ba-2026` como historia curada; probar el trip real BA end-to-end |
| Trips existentes con identificadores inconsistentes | Med | Normalizar al identificador canónico; default seguro sin caída silenciosa |
| URL directa `/experience?tripId=` de trip inexistente/sin historia | Med | Fallback honesto + guardas de resolución (EMPTY, no Experience errada) |
| Progreso local atado al storyId fijo | Low | Re-clavar al identificador canónico; aceptar reset de progreso legacy si aplica |

## Rollback Plan

- Cambio detrás de rama/feature: revertir `ExperiencePage` al import estático restaura el comportamiento actual (BA siempre).
- Sin migración destructiva: el identificador canónico se deriva; no se borran campos hasta confirmar estabilidad en producción.
- Backend: mantener `deriveBaseStoryId` como fallback durante la transición; feature-flag opcional para volver a la resolución vieja.

## Dependencies

- Capa `connected` existente (`useConnectedTrip`, `useStoryContent`, `useTripId`) — ya disponible.
- StoryPackage curado `story-ba-2026` — único contenido real hoy.

## Success Criteria

- [ ] Abrir un trip renderiza SU historia real (no siempre BA).
- [ ] Trip sin historia curada muestra fallback honesto en Portada, nunca Experience errada.
- [ ] Un único identificador canónico gobierna trip↔historia; `storyPackageId` muerto eliminado/normalizado.
- [ ] Agregar una segunda historia es solo contenido + entrada de catálogo.
- [ ] Progreso/recuerdos/fotos quedan atados al identificador canónico del trip.
- [ ] Flujo StoryBeginning → Portada → Cover → Experience sin hard navigation ni salto a la lista general.
