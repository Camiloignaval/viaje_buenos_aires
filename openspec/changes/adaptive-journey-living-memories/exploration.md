# Exploration: Adaptive Journey & Living Memories

> **Decisión primero.** La fase es viable sin crear motores ni capas. Debe evolucionar el compositor y los consumidores de aplicación existentes, agregar metadata Story exacta, abrir una ruta autenticada sobre el adaptador Memory existente y cerrar Weather con un gate server-side. Hoy Weather/Light no son productivamente representables: no es un problema de copy o UI, sino de cuatro costuras objetivas sin cablear.

## Current State

### Rama, OpenSpec y trabajo ajeno

- La rama real es `etapa-7-living-context`. El HEAD inspeccionado es `7b4802c docs(openspec): archive first-visible-experience`.
- Ya están archivados y sincronizados como specs canónicos, en el orden autorizado: `living-context-foundation`, `living-context-weather`, `context-decision-engine`, `companion-orchestrator`, `editorial-voice`, `memory-engine`, `first-real-experience`, `first-visible-experience`. `companion-experience-closure` evolucionó `first-visible-experience` in-place; su archive report declara el noveno nombre como no-op deliberado, no como cambio faltante.
- El único OpenSpec activo ajeno es `openspec/changes/trip-sharing-and-invitations/`; no debe tocarse.
- No hay staging ajeno. Deben preservarse el cambio unstaged `app/src/features/pwa/PushCompanion.tsx` y los untracked de documentación/media (`31_ALAIA_REFINAMIENTO_EDITORIAL_ETAPA_6.md`, `ALAIA_ETAPA_6_8_PRODUCT_EXCELLENCE.md`, `logo_original.png`, `alaia-opening_2.mp4`).

### Autoridades vigentes

| Autoridad | Contrato real | Consecuencia para Fase 9 |
|---|---|---|
| Living Context / Weather | `weatherContextQueryOptions` habilita sólo Trip activo `today|in-progress`, hoy local y destino con coordenadas/timezone; query key `context-engine/weather/cityId/timezone/localDate`, `staleTime=15m`, `retry=false`. Backend cachea éxitos 15m y deduplica in-flight. | Reusar TanStack Query y un instante estable. No consultar provider desde UI ni duplicar requests. Freshness y `expiresAt` siguen siendo autoridad. |
| Decision Engine | Reglas exactas: `weather_attention_candidate` exige Weather fresh/coherente + actividad `outdoor=true`, `indoor!=true`, `rainFriendly=false`, ventana vigente y lluvia/tormenta/nieve o precipitación `>=60`; `light_moment_candidate` exige sunrise/sunset fresh, `photoMoment=true` e intersección de ventanas ±1h; `trip_last_day` usa temporal destino. Prioridades: Weather high; hoy/último día/Light normal; mañana low. Selecciona máximo una Act. | No hace falta una jerarquía paralela. El consumidor sólo representa `selected`; jamás promueve `evaluations`. |
| Companion | Mapea sin ambigüedad: mañana→`timeline`, hoy→`in_app`, último día→`memory`, Weather→`push`, Light→`editorial`. Frecuencia: 6h, con bypass high distinto desde 60m; dedupe/historial permanecen caller-owned. | Conservar estos canales conceptuales. La proyección in-app debe autorizarse aditivamente en el compositor, no mutando Companion ni forzando el canal. |
| Editorial | `editorial-v1` ya cubre los cinco kinds con dos textos es-CL deterministas; Weather y Light ya tienen copy seguro. | No extender catálogo ni inventar copy. La UI muestra `EditorialMessage.text` literal. |
| First Real Experience | Ejecuta las cinco autoridades, pero liga `DeliveryIntent.destination` al canal Companion, exige siempre `references=[editorial_message,memory_candidate]` y termina sin intent ante `MemoryDiscard`. | Es el principal vacío objetivo: Weather/Light son transitorios por diseño, por lo que hoy nunca pueden llegar a una experiencia visible. Debe desacoplar “intervención autorizada” de “merece recuerdo”. |
| Visible Experience | Sólo proyecta `composed + in_app + intent/message channel iguales`; receipts V1 sólo aceptan `in_app` y la tupla con memory candidate. `pending` no deduplica; `visible|dismissed|expired` sí alimentan Companion. | Mantener lifecycle y storage same-tab; permitir la referencia editorial-only para contextos transitorios. |
| Memory Engine | V1 exacto: `trip_started`, `trip_last_day`, `favorite_marked`, `first_chapter_opened`. Weather/Light se descartan como `transient_context`. Persistencia Mongo idempotente sobre `memories`, `recordKind=alaia_memory_record_v1`, `semantic-v1:` y unique `(tripId,legacyId)`. | Persistir sólo hitos ya candidatos. `favorite_marked` es el nombre contractual real; “meaningful_favorite” no existe. No convertir Weather/Light ni receipts en recuerdos. |

### Vacíos objetivos comprobados

1. `story-ba2026.json` tiene 28 actividades y **0** objetos `intelligence`; `timeWindow` y `bestMoment` son texto libre. El diseño canónico de Decision prohíbe parsearlos. Sin metadata booleana y ventana estructurada, Weather/Light deben abstenerse correctamente.
2. `useFirstVisibleExperience` entrega `activities: []`; `useLivingContext` es hoy un hook sin consumidor productivo; `composeFirstRealExperience` tampoco recibe `weatherAdapter` ni un `LivingTravelContext` ya resuelto. Weather queda `missing_weather_input` aunque la query exista.
3. Los canales conceptuales Weather=`push` y Light=`editorial` no autorizan hoy un intent in-app. Cambiar ese mapping reduciría capacidades verificadas; la costura correcta es una tabla cerrada de proyección dentro del compositor existente.
4. `MemoryDiscard(transient_context)` cancela delivery; contradice el principio de producto “no toda intervención merece recuerdo”.
5. `platformMemory.js` no tiene endpoint semántico ni lectura por scope: sólo `persistOnce(accepted)` y `getAndRemember(memoryKey, scope)`. Las rutas `/api/memories` son legacy y excluyen correctamente records semánticos; no deben reutilizarse.
6. Weather productivo está **abierto** hoy: cualquier sesión válida llega al provider Open-Meteo; no existe flag en `platformConfig`, no hay comprobación de membership/trip y no hay atribución productiva. Es un blocker de rollout Weather, no del resto de Alaia.

## Productive Runtime and Representable Experiences

### Composición recomendada sin arquitectura nueva

```text
Trip/Story/query snapshot + instante estable
  -> useLivingContext (TanStack Query; Weather opcional/gated)
  -> candidatos Story exactos (sin parsear texto)
  -> composeFirstRealExperience con LivingTravelContext oficial
  -> Decision.selected (máximo uno)
  -> CompanionAction | silence
  -> EditorialMessage
  -> MemoryCandidate | MemoryDiscard
  -> DeliveryIntent cerrado por kind/superficie
  -> receipt pending -> visible -> dismissed|expired, sólo si in_app
  -> persistencia semántica sólo si existe MemoryCandidate autorizado
```

La evolución mínima de `firstRealExperience.ts` conserva su entrada actual para tests/simulador y admite un `LivingTravelContext` oficial pre-resuelto para el consumidor React. El compositor debe producir:

- Weather/Light: `MemoryDiscard(transient_context)` + un intent `in_app` editorial-only cuando la tabla cerrada lo autorice;
- trip_start_today: intent `in_app` + `MemoryCandidate(trip_started)`;
- trip_last_day: intent `memory` + `MemoryCandidate(trip_last_day)`, sin UI contextual;
- mañana: conserva `timeline`; no se fuerza UI;
- silencio/error: cero intents y cero artefactos downstream.

La tabla vive en el compositor ya existente y sólo proyecta `weather_attention_candidate|light_moment_candidate -> in_app` para la superficie de capítulo activo. No modifica `CompanionAction.channel`, no agrega destinos a Companion y no autoriza Push. El linaje mantiene kind, action/message refs y selected decision; cualquier mismatch falla cerrado.

### Story metadata necesaria

Agregar de forma aditiva a `Activity` una ventana estructurada exacta, por ejemplo `contextWindow: { validFrom, validUntil, timezone }`, y validar ISO/IANA/orden en Health Check. En `story-ba2026.json` sólo se curan las actividades realmente elegidas con `intelligence.outdoor|indoor|rainFriendly|photoMoment` y `contextWindow`. El adaptador de aplicación copia esos cuatro booleanos y la ventana a `NormalizedActivityCandidate`; no lee `title`, `description`, `timeWindow`, `bestMoment`, `moment`, prompts ni notas.

Esto cierra el gap anticipado por el diseño de Etapa 7.3 sin cambiar una regla: el contrato `NormalizedActivityCandidate` ya existe y esperaba exactamente un adapter productivo futuro.

## UX Placement

| Experiencia | Superficie exacta | Representación | Justificación / terminal |
|---|---|---|---|
| Weather relevante | `/experience?tripId=…`, capítulo activo, entre `ChapterHero` y `<ul class="activities">` | Reusar la primitiva pequeña `VisibleCompanionExperience`; literal editorial, filete, dismiss y receipt. | Está junto al plan del día sin identificar/reordenar una actividad ni revelar clima crudo. Weather high ya gana la selección. |
| Luz natural | Misma ranura contextual del capítulo activo | Misma primitiva visual; literal `light-*`, sin hora dominante, CTA ni “toma una foto”. | La decisión ya exige actividad `photoMoment` y ventana de luz; no hace falta un componente distinto ni geolocalización. |
| Último día | Sin momento contextual visible en v1 | Persistencia de `trip_last_day` por intent `memory`; cero wrapper en capítulo/portada. | Companion fija `memory`. Forzar `in_app` violaría el canal. En conflicto normal, `trip_last_day` precede Light por el orden canónico y no se promueven evaluaciones perdedoras. |
| Recuerdo que vuelve | Álbum del viaje (`TripAlbum`), después del texto de apertura y antes de grupos legacy | Un `LivingMemoryMoment` read-only con un único texto editorial persistido; sin IDs, métricas, fecha técnica, actions ni auto-anuncio. | `trip_started|trip_last_day` son hitos de todo el viaje, no de una actividad. Se consulta por ruta semántica separada y jamás se mezcla en `Memory[]` legacy. |
| Silencio | Todas | `null`: sin wrapper, placeholder, espacio, motion ni aria residual. | Weather disabled/stale/error, metadata ausente, receipt, preferencia, membership, Story legacy o intent inválido fallan cerrados. |

No usar `Para ustedes`: es una superficie global de cuenta/PWA/feedback y perdería el ownership del viaje. No usar la Portada para Weather/Light: convertiría el inicio del viaje en feed y alejaría el contexto de las actividades. No crear pantalla Memories. El álbum muestra como máximo **un** hito semántico y mantiene sus cards legacy sin cambios.

## Hierarchy, Receipts and Continuity

- La jerarquía de dominio ya está resuelta: `Decision.selected` + prioridad/orden, luego frecuencia/dedupe Companion. La capa visual sólo comprueba vigencia, intent permitido, receipt y disponibilidad de superficie.
- Una única ranura en `InProgress` garantiza máximo un protagonista contextual. No existe cola: si el selected no permite esa superficie, se conserva su terminal real; nunca se promueve otra evaluación.
- Reusar `alaia:visible-delivery:v1:<scope-hash>` y estados `pending|visible|dismissed|expired`. Ampliar únicamente el validador de referencias para aceptar `['editorial_message']` o la tupla existente; identidad, scope usuario+viaje, expiración lazy y `processedAt` al confirmar visibilidad no cambian.
- Navegación/recarga same-tab conservan continuidad; usuario/viaje distinto tiene key distinta; storage corrupto/unavailable produce silencio. No se promete cross-tab/cross-device.
- Persistencia semántica no depende de render: `trip_started` se envía una vez después de confirmar `visible`; `trip_last_day` se envía al confirmar el intent `memory`. Reintentos/concurrencia quedan absorbidos por `persistOnce`. Dismiss nunca crea, modifica ni borra memoria.

## Memory Persistence and Read Path

### Escritura

```text
MemoryCandidate
  -> acceptMemoryCandidate (core existente)
  -> POST /api/trips/:tripId/semantic-memories
  -> requireTripMember + owner/scope/story validation
  -> createSemanticMemoryRepository.persistOnce
  -> {status:'persisted'|'duplicate', type} sanitizado
```

### Lectura

```text
TripAlbum visible
  -> TanStack Query GET /api/trips/:tripId/semantic-memories?storyId=...
  -> requireTripMember
  -> repository.getLatestAndRemember(scope, ['trip_last_day','trip_started'])
  -> {memory:{type,text}|null}
  -> LivingMemoryMoment o null
```

`getLatestAndRemember` es una extensión del adaptador existente, no otro repositorio: filtra `recordKind`, owner de sesión, trip, story, estados `persisted|remembered` y tipos permitidos; ordena de forma determinista por `occurredAt/createdAt`, limita a uno y marca `remembered` sólo tras una lectura válida. La proyección pública omite `memoryKey`, `legacyId`, owner, trip/story IDs, decision/editorial refs, evidence, retention y state. Un error de memoria degrada a ausencia y no rompe Experience/álbum.

Los eventos actuales autorizan productivamente sólo `trip_started` y `trip_last_day` sin inventar señales. `favorite_marked` y `first_chapter_opened` existen en Memory V1, pero todavía requerirían cablear sus eventos explícitos; quedan fuera de esta fase para evitar escanear stores o convertir Memory en log.

## Weather Production Gate

### Estado actual

`weatherContextClient -> POST /api/context/weather -> routes/context/weather.js -> getWeatherSnapshot -> openMeteoWeatherProvider.fetchWeather`. La query React y el cache backend ya evitan duplicados, pero el route sólo usa `requireUser`; hoy no existe gate, membership ni aprobación/atribución. `source: open-meteo` se normaliza internamente y no debe llegar a la UI.

### Decisión

- Agregar `ENABLE_WEATHER_PROVIDER` a `platformConfig.flags`, booleano y **false por defecto en todos los entornos**.
- Dev/test pueden inyectar mock o configurar `ENABLE_WEATHER_PROVIDER=true` de forma explícita. Producción sin flag válido responde Weather unavailable y ejecuta cero llamadas a cache/provider; las reglas temporales y Memory siguen funcionando.
- Fortalecer el body con `tripId` y usar `requireTripMember`; antes del provider se comprueba que coordenadas/timezone/fecha corresponden al Trip autorizado. Otro trip, mismatch o viaje fuera de ventana ejecuta cero provider requests. La respuesta continúa siendo sólo snapshot normalizado.
- Open-Meteo no se presenta como aprobado. Antes de activar el flag en producción se debe resolver proveedor comercial/self-host/reemplazo y ubicar la atribución exigida en una superficie legal/producto compatible. Mientras eso no ocurra, el gate permanece off y no aparece experiencia Weather. No se expone nombre de provider dentro del momento editorial.

Provider error, timeout, payload inválido o snapshot stale quedan aislados en `weather unavailable/stale`; Financial puede fallar y Weather continuar, y Weather puede fallar sin afectar reglas temporales.

## Accessibility, Responsive and PWA

- El contextual moment conserva `aside` nombrado, h3 “Alaia”, botón dismiss de 44×44, foco visible, teclado, decoración aria-hidden, sin `role=alert` ni `aria-live`.
- El recuerdo es una región estática nombrada, sin dismiss obligatorio ni anuncio automático. Silencio no deja nodo asistivo.
- Reusar width fluido/min-width 0 y agregar sólo estilos de ubicación en `experience.css`; sin card pesada, overlay, banner, ancho fijo u overflow. No alterar CTA/ReadingTopbar.
- Entrada sólo opacity/translate, una vez por receipt; reduced-motion elimina animación. `TripAlbum` y capítulo ya usan safe-area y max-width; validar 360/390/414/430, tablet, desktop y WebKit/iPhone. La continuidad PWA y `sessionStorage` permanecen same-tab; no tocar SW ni Push.

## QA and Visual Evidence

- Strict TDD: Vitest para compositor, candidato Story, hook consumidor, proyecciones DOM, receipts, memoria visible, accesibilidad/CSS y terminales; Node para config, Weather route/cache/provider, Memory repository y nueva route semántica.
- `npm test` sólo incluye `src/**/*.test.js` y `lib/**/*.test.js`; las suites `routes/**/*.test.js` deben ejecutarse explícitamente con `node --test`.
- Playwright **puede correr sin build**: `e2e/global-setup.ts` levanta Vite dev en `127.0.0.1:4188`. Agregar fixtures dev-only `adaptive-weather`, `adaptive-light`, `adaptive-silence`, `living-memory` a `/dev/states?state=…`; no requieren Mongo/provider y deben recorrer los ocho projects existentes: 360, 390, 414, 430, tablet, desktop, Firefox desktop y WebKit iPhone. Agregar una corrida reduced-motion focal y revisar safe-area/overflow/copy literal.
- La evidencia histórica Engram `#856` documenta un fallo ambiental conocido de Playwright 1.61.1: Firefox falla en `browserContext.newPage` con `Cannot read properties of undefined (reading '_page')` antes de cargar Alaia. No se deben quitar projects/skips; si reaparece, separar harness de assertions y reportar Chromium/WebKit con honestidad.
- Validación final requerida: focales, `npm run typecheck`, `npm test`, `npm run test:react`, rutas explícitas, Playwright/inspección visual si el entorno permite, `git diff --check` y matriz OpenSpec. No build por `AGENTS.md` y no declarar que se ejecutó.

## Boundaries, Privacy and Protected Paths

- No registrar/renderizar coordenadas, provider/source, IDs, dedupe/memory keys, fechas técnicas, evidence, reason codes, payloads, texto privado, notas, emails, tokens o errores crudos. Observabilidad sigue `{kind}` congelado y best-effort; categorías aditivas permitidas: `adaptive_flow_started`, `adaptive_result_layer`, `memory_persisted`, `memory_discarded`, `memory_rendered`, `contextual_rendered`, `contextual_silence`, `delivery_expired`.
- Proteger byte-semantics de `context-engine/decision`, `companion`, `editorial` y core `memory`; no tocar mappings/reglas/catálogos/policy. No Story text inference, geofencing, provider nuevo, scheduler, Push, timeline o IA.
- Mantener guards legacy de `routes/memories*`, `platformSync`, Album local y sync. La nueva ruta semántica es la única superficie productiva de records V1.
- Story legacy/sin metadata exacta: Weather/Light abstain. Usuario sin membership, trip distinto o story scope distinto: 403/null sanitizado y cero write/read/provider. Observer/storage/Memory fallidos no alteran el contenido principal.

## Affected Areas

### Nuevos archivos probables

- `app/src/features/experience/lib/adaptiveJourney.ts` + test — adapter puro de metadata Story exacta y proyección cerrada por superficie; no engine.
- `app/src/features/experience/hooks/useAdaptiveJourney.ts` + test — consumidor productivo, instante estable, queries, receipts y persistencia fuera del render.
- `app/src/features/experience/components/LivingMemoryMoment.tsx` + test — único recuerdo editorial seguro en álbum.
- `app/src/features/experience/api/semanticMemoryApi.ts` + test — cliente GET/POST por viaje.
- `app/routes/trips/[tripId]/semantic-memories.js` + test — endpoint member-scoped y respuestas sanitizadas.
- `openspec/changes/adaptive-journey-living-memories/{proposal.md,design.md,tasks.md,state.yaml,specs/...}` — fases posteriores del único cambio.

### Modificaciones probables

- `app/src/features/experience/firstRealExperience.ts` y tests — delivery editorial-only, MemoryDiscard no bloqueante y proyección in-app cerrada sin cambiar Companion.
- `app/src/features/experience/lib/{visibleExperience,visibleDeliverySession}.ts` y tests — superficie de capítulo y referencias permitidas manteniendo V1 receipts.
- `app/src/features/experience/{experienceTypes.ts,experience.css}`, `components/{Modes,experienceContext}.tsx`, `pages/ExperiencePage.tsx`, `hooks/useResolvedStory.ts` y tests — ranura contextual y recuerdo en TripAlbum.
- `app/src/features/experience/hooks/useFirstVisibleExperience.ts` y tests — persistir `trip_started` al confirmar visibilidad, compartiendo primitives sin cambiar la portada.
- `app/src/features/story/engine/{types.ts,intelligence.ts}`, `health/{healthCheck.ts,...tests}` y `app/src/story/data/story-ba2026.json` — metadata booleana/ventana estructurada curada y health validation.
- `app/lib/{platformConfig,platformMemory,apiRoutes}.js` y tests — gate, lectura semántica safe y nueva route.
- `app/routes/context/weather.js`, `weather.test.js`, `app/src/features/context-engine/{weatherContextClient,weatherContextQuery,useLivingContext}.ts` y tests — trip membership/gate y reuse de query oficial; sin tocar reglas Weather.
- `app/src/features/dev/StatesGallery.tsx`, `app/e2e/states.spec.ts` y shots relevantes — fixtures visuales dev-only.

## Approaches

1. **Evolucionar compositor y consumidores existentes (recomendada)** — metadata Story exacta → Living Context oficial → cinco autoridades → proyección cerrada → receipts/Memory API existentes.
   - Pros: no crea motor/layer, conserva reglas y canales, resuelve transitorios sin falsos recuerdos, aprovecha React Query/Mongo/receipts.
   - Cons: toca varias costuras verificadas y exige tests de regresión estrictos.
   - Effort: High.

2. **Forzar Weather/Light/Last Day a `in_app` en Companion** — cambiar mappings para satisfacer UI.
   - Pros: menos cambios en compositor.
   - Cons: elimina semántica aprobada `push|editorial|memory`, reduce capacidades y viola la instrucción de no forzar canal.
   - Effort: Medium; rechazada.

3. **UI universal que lee Weather/Story/Memory directamente** — un widget decide y renderiza todo.
   - Pros: implementación aparentemente rápida.
   - Cons: bypass de autoridades, parsing de texto, duplicación de reglas, mezcla legacy/semantic, múltiples protagonistas y nueva arquitectura encubierta.
   - Effort: High y riesgo crítico; rechazada.

## Recommended Delivery Slices

Estimación total: **1.600–2.300 líneas cambiadas**, riesgo **High** sobre el presupuesto de 400. Requiere feature-branch chain/local work units coherentes:

1. **Contracts/composition + Story evidence** (450–650): RED/GREEN para metadata exacta, adapter, delivery editorial-only y terminales; sin UI/backend.
2. **Weather ownership/gate + productive query** (350–500): config/route/client/hook, cero provider cuando disabled/no-membership y aislamiento stale/error.
3. **Semantic Memory API** (350–500): repository read projection, endpoint GET/POST, ownership/dedupe/concurrencia/legacy isolation.
4. **Adaptive UI + receipts/hierarchy** (350–500): capítulo Weather/Light, Last Day terminal, TripAlbum memory, accessibility/responsive/silence.
5. **Integration + visual evidence** (250–400): four real outcomes, navigation/reload/scope/storage, dev fixtures, Playwright matrix y OpenSpec verification.

Cada slice tiene rollback autónomo. No usar `git add -A`, no squash/push/tags y no archivar el nuevo cambio automáticamente.

## Risks

- El compositor actual asume que toda entrega tiene MemoryCandidate; cambiarlo sin preservar First Real/Visible puede romper la experiencia “hoy”.
- Un adapter que parseara `timeWindow` convertiría texto libre en autoridad. Sólo metadata exacta puede cerrar este riesgo.
- Activar `ENABLE_WEATHER_PROVIDER` en producción sin decisión comercial/atribución mantiene riesgo legal; default false es obligatorio.
- La route Weather actual sólo autentica usuario, no membership; conectarla productivamente sin cerrar ownership permitiría consultas arbitrarias.
- Una respuesta Memory demasiado rica filtraría hashes/evidence/IDs; el DTO visible debe ser `{type,text}` exacto.
- Receipts previos de sesiones anteriores no deben usarse para backfill de recuerdos: sería inferencia. La capacidad aplica a eventos autorizados futuros.
- Firefox puede fallar antes de cargar la app por el harness conocido; no confundirlo con regresión ni ocultarlo.

## Ready for Proposal

**Yes.** No hay blocker arquitectónico. La propuesta debe fijar como decisiones no negociables: (1) no modificar reglas/mappings de los motores; (2) cerrar Weather con `ENABLE_WEATHER_PROVIDER=false` por defecto; (3) añadir sólo metadata Story estructurada; (4) permitir delivery transitorio sin MemoryCandidate dentro del compositor existente; (5) persistir/leer milestones mediante una route semántica member-scoped y DTO `{type,text}`; (6) Weather/Light en una única ranura del capítulo, Last Day memory-only y un único hito en TripAlbum; (7) slices encadenados por riesgo >400 líneas.
