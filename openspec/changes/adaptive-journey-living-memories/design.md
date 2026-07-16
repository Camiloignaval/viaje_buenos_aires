# Design: Adaptive Journey & Living Memories

## Technical Approach

Evolucionar costuras existentes, sin motor ni capa nueva. Un adaptador puro convierte metadata Story exacta en `NormalizedActivityCandidate`; `useAdaptiveJourney` obtiene un `LivingTravelContext` oficial con TanStack Query y un instante estable, y el compositor sigue ejecutando Decision → Companion → Editorial → Memory. Sólo `Decision.selected` continúa. La UI proyecta un único intent autorizado; la persistencia ocurre en efectos/query mutations, nunca durante render.

```text
Story + Trip + instante → LivingContext → Decision.selected → Companion → Editorial
                                                           ↓
                                      MemoryCandidate | MemoryDiscard
                                                           ↓
                           DeliveryIntent → receipt → UI / Memory API
```

## Architecture Decisions

| Decisión | Alternativa rechazada | Rationale |
|---|---|---|
| Metadata aditiva `Activity.contextWindow` y `intelligence` existente | Parsear `timeWindow`, título o copy | Sólo evidencia curada puede ser autoridad. |
| `FirstRealExperienceInput` acepta `resolvedLivingContext?` y conserva `livingContext` actual | Duplicar compositor | Mantiene simulador/API y evita resolver Weather dos veces. |
| Tabla local cerrada `weather_attention_candidate|light_moment_candidate → chapter/in_app/editorial-only` | Cambiar mappings Companion | Preserva `push|editorial|memory`; nunca promociona evaluaciones perdedoras. |
| Extender receipt V1 sólo para referencia editorial-only | Otro storage/versión incompatible | Conserva scope, identity, expiry e historial caller-owned. |
| Extender `platformMemory` y colección `memories` | Store o mezcla con Album legacy | Mantiene dedupe atómico y partición semántica. |

## Contracts and Flow

```ts
type ContextWindow = Readonly<{validFrom:string; validUntil:string; timezone:string}>;
type DeliveryReferences = readonly ["editorial_message"] |
  readonly ["editorial_message", "memory_candidate"];
type LivingMemoryDTO = Readonly<{type:"trip_started"|"trip_last_day"; text:string}>;
```

Health Check valida claves exactas, ISO instants, timezone IANA y `validUntil > validFrom`. El adaptador copia únicamente `activityId`, `outdoor`, `indoor`, `rainFriendly`, `photoMoment` y `contextWindow`; metadata ausente/contradictoria se omite.

La entrada es una unión aditiva: forma legacy con `livingContext`, o forma productiva con `resolvedLivingContext: LivingTravelContext`; nunca ambas. El resultado `composed` actual conserva `memoryCandidate`; se agrega `transient_composed` con `memoryDiscard` e intent editorial-only. Ambos validan action/message/decision refs exactas.

| Selected | Superficie/destino | Referencias |
|---|---|---|
| `trip_start_today` | `active_trip_home/in_app` | editorial + memory |
| Weather/Light | `active_story_chapter/in_app` | editorial-only |
| `trip_last_day` | sin UI / `memory` | editorial + memory |
| tomorrow/silence/error | sin UI | ninguna |

No hay cola: máximo un slot y jamás se promueve otra evaluación. Last Day persiste al confirmar el intent `memory`; Weather/Light jamás persisten. `trip_started` persiste sólo después de `onVisible`; fallo de render no persiste y dismiss no altera memoria. El validador/seed de identity del receipt V1 acepta ambas tuplas, pero el documento persistido conserva su allowlist categórica actual.

Weather POST exacto: `/api/context/weather` `{tripId,latitude,longitude,timezone,localDate}`. Antes de cache/provider, `ENABLE_WEATHER_PROVIDER` (default `false`), `requireTripMember` y coincidencia trip/body validan ownership; disabled/mismatch realizan cero llamadas y todo error degrada a unavailable. No se declara proveedor aprobado ni se muestra attribution/source.

Memory route autenticada `/api/trips/:tripId/semantic-memories`:

- `POST` body `MemoryAccepted` exacto; sesión, trip y story deben coincidir. Respuesta `{status:"persisted"|"duplicate",type}`.
- `GET ?storyId=…`; respuesta `{memory:LivingMemoryDTO|null}`.

`getLatestAndRemember` filtra `recordKind`, owner/trip/story, `persisted|remembered` y tipos permitidos; ordena `occurredAt,createdAt`, limita uno y marca `remembered`. Concurrencia usa el upsert/índice existente. Ninguna respuesta expone IDs, refs o evidence.

## File Changes

| Área | Cambio |
|---|---|
| `app/src/features/story/{engine,health}/`, `app/src/story/data/story-ba2026.json` | Schema, health y subset curado. |
| `app/src/features/experience/firstRealExperience.ts`, `lib/adaptiveJourney.ts`, `hooks/useAdaptiveJourney.ts` | Contexto pre-resuelto, tabla y consumidor estable. |
| `lib/{visibleExperience,visibleDeliverySession}.ts`, `components/Modes.tsx`, `VisibleCompanionExperience.tsx`, `LivingMemoryMoment.tsx`, `experienceTypes.ts`, `experience.css` | Componentes pequeños: una ranura tras `ChapterHero`; un recuerdo tras apertura de `TripAlbum`; silencio `null`. |
| `weatherContext{Client,Query}.ts`, `app/routes/context/weather.js`, `platformConfig.js` | `tripId`, gate y membership. |
| `api/semanticMemoryApi.ts`, `app/routes/trips/[tripId]/semantic-memories.js`, `platformMemory.js`, `apiRoutes.js` | GET/POST semántico separado. |

Observer emite sólo `{kind}`: `adaptive_flow_started`, `adaptive_result_layer`, `contextual_rendered|contextual_silence`, `memory_persisted|memory_discarded|memory_rendered`, `delivery_expired`. Componentes pequeños reutilizan `VisibleCompanionExperience`: región nombrada, dismiss 44px, foco, sin live/alert, ancho fluido/safe-area, cero overflow y motion anulada por reduced-motion.

## Testing and Rollout

Cinco slices reversibles: (1) Story/adaptador; (2) gate Weather; (3) compositor/receipts; (4) Memory route/álbum; (5) hook/UI/QA. Vitest cubre autoridad única, lineage, terminales, lifecycle, a11y/CSS; Node cubre gate cero-call, ownership, dedupe/concurrencia y aislamiento legacy. Estados sólo dev: `adaptive-weather`, `adaptive-light`, `adaptive-silence`, `living-memory`. Playwright usa Vite dev, ocho projects y reduced-motion, sin build; un fallo Firefox `_page` se reporta como harness, sin skips ni eliminar projects.

Proteger semántica de Decision/Companion/Editorial/Memory core y specs archivados. Rollback: apagar Weather y revertir slices 5→1; hoy y Album legacy sobreviven. Activación productiva Weather queda bloqueada hasta aprobación comercial/atribución. No hay preguntas abiertas de implementación.
