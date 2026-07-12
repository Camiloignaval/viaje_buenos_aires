# Design: Resolución de historia por catálogo (story-catalog-resolution)

## Technical Approach

`ExperiencePage` deja de importar un StoryPackage estático y pasa a resolver la historia **a través de la capa `connected` que ya existe** (`useConnectedTrip` + `useStoryContent`). El `tripId` viene de la URL (`useTripId`), el backend deriva `baseStoryId` server-side y un **catálogo** (`platformStories`) resuelve el StoryPackage real. `experience` solo consume la resolución y renderiza; NO reimplementa data-fetching. Se añade una **Portada por viaje** (`/trips/:tripId`) como destino post-creación y punto de entrada voluntario a la Experience. Fallback honesto = estado `EMPTY` que ya calcula `useStoryContent`; nunca cae a Buenos Aires.

Nota de tamaño: este documento excede el presupuesto de 800 palabras del skill de forma deliberada — la tarea de invocación exige cubrir 7 bloques (puntos 1-6 y 10) con precisión archivo-por-archivo para que `sdd-tasks` no reinvestigue.

---

## 1. Fuente única de verdad

**Campo canónico: `baseStoryId`** (valor ej. `"ba-2026"`). Se elige sobre `storyPackageId` porque `baseStoryId` YA es el contrato vivo que `connected` lee hoy (`useStoryContent` línea 38), lo persiste el backend (`normalizeTripInput` → `createTripDocument`) y lo expone la API (`publicTripSummary` línea 309). `storyPackageId` es campo muerto (`createTripDocument` lo escribe `null` y nadie lo lee) → **se elimina de la escritura**.

**Distinción clave (dos ids, no confundir):**
- `baseStoryId` = id de **catálogo** trip↔historia (`"ba-2026"`, = `MVP_BASE_STORY_ID`). Único identificador canónico.
- `storyPackage.storyId` = id **interno** del contenido curado (`"story-ba-2026"`). NO es el contrato trip↔historia.

**Punto único de resolución:** solo el backend (`platformStories.getBaseStory`) traduce `baseStoryId` → StoryPackage. Cliente (`connected`, `experience`) nunca mapea ids a contenido; solo pasa `baseStoryId` y consume lo que devuelve la API. Cero lógica duplicada.

| Capa | Lee/Escribe `baseStoryId` | Cambio |
|------|---------------------------|--------|
| Backend Mongo doc | Escribe (`deriveBaseStoryId`) | Deja de escribir `storyPackageId` |
| API pública | Expone en summary/detail | Sin cambio |
| `Trip` type (`types.ts:61`) | `baseStoryId: string \| null` | Sin cambio |
| `connected` (`useStoryContent`) | Lee `trip.baseStoryId` | Sin cambio (ya correcto) |
| `experience` (`ExperiencePage`) | Consume vía `connected` | **Deja de ignorarlo** |

**Compatibilidad `storyPackageId`:** ninguna capa lo lee → no requiere compat de lectura. Solo se retira su escritura en `createTripDocument`. Docs viejos con `storyPackageId: null` quedan inertes (nunca consultados). Sin migración destructiva.

---

## 2. Resolución del Story Package

**Cómo obtiene el trip `ExperiencePage`:** `tripId` desde `useTripId()` (`?tripId=` en URL, reactivo vía `useSearchParams`) → `useConnectedTrip(tripId)` → `context.trip` (con `baseStoryId`).

**Cómo resuelve el StoryPackage:** `useStoryContent(context)` (capa `connected`) llama `getStory(baseStoryId)` → `GET /api/stories/:baseStoryId` → `{ story }` donde **`story.storyPackage`** es el StoryPackage validado server-side (`getBaseStory` lo incluye). Se REUSA íntegro; `experience` no vuelve a fetchear.

**Nuevo hook orquestador (thin) `useResolvedStory` en `experience`:** compone `useTripId` + `useConnectedTrip` + `useStoryContent` y devuelve un estado discriminado. NO hace red — solo traduce las señales de `connected` al vocabulario que `experience` necesita:

```ts
type ResolvedStory =
  | { kind: "local" }                                   // sin tripId → demo BA explícito
  | { kind: "loading" }
  | { kind: "ready"; storyPackage: StoryPackage; scopeId: string } // scopeId = tripId
  | { kind: "empty" }        // el trip EXISTE pero baseStoryId es null o no está en el catálogo
  | { kind: "not-found" }    // el trip mismo no existe o no es accesible para el usuario (404/403)
  | { kind: "error"; message: string };  // fallo técnico real (red/API/schema inválido)
```

**Derivación exacta del 6º estado (señal por señal, verificado contra el código real):**

`useConnectedTrip` (`useConnectedTrip.ts:32-47`) YA distingue en el cliente, con `retry:false`:
- `getTrip(tripId)` → 404/403 (indistinguibles desde el cliente, igual que `requireTripMember`) ⇒ `TripContextStatus.NOT_FOUND` (`status.ts:9`).
- Cualquier otro fallo (red / 500 / parseo) ⇒ `TripContextStatus.ERROR`.

**GOTCHA que fuerza este diseño (raíz de la inconsistencia que detectó `sdd-tasks`):** tanto `useStoryContent` (`contextGate`, `useConnectedContent.ts:26-31`) como `combineReadiness` (`readiness.ts:54-62`) COLAPSAN `NOT_FOUND` y `ERROR` en un único `ERROR`. Por eso `useResolvedStory` **NO puede derivar `not-found` desde `useStoryContent` ni desde `useConnectedReadiness`**: DEBE leer el `status` CRUDO de `useConnectedTrip`, antes del colapso.

Mapa de derivación:

| `useConnectedTrip.status` | `useStoryContent.status` | `ResolvedStory.kind` |
|---------------------------|--------------------------|----------------------|
| `local` (sin tripId) | — | `local` |
| `loading` | — | `loading` |
| `not-found` (getTrip 404/403) | — (colapsado, se ignora) | `not-found` |
| `error` (red/técnico) | — (colapsado, se ignora) | `error` |
| `success` | `loading` | `loading` |
| `success` | `empty` (baseStoryId null o getStory 404) | `empty` |
| `success` | `error` (getStory técnico ≠404) | `error` |
| `success` | `success` | `ready` |

**Responsabilidades — frontera exacta:**
- `connected` = **datos**: resuelve Trip por `tripId` (LOCAL/LOADING/SUCCESS/**NOT_FOUND**/ERROR), deriva `baseStoryId`, fetchea story/media, calcula status de contenido (LOCAL/LOADING/SUCCESS/EMPTY/ERROR). Dueño único de la red y del cache React Query. Ojo: la señal `NOT_FOUND` vive solo en el estado de trip; los agregadores (`useStoryContent`/`combineReadiness`) la colapsan.
- `experience` = **render**: consume `useResolvedStory`, monta `useExperience(storyPackage, scopeId)` o el estado de fallback/loading/error. No conoce `getTrip`/`getStory`.

**Código hardcodeado eliminado (archivo por archivo):**
- `ExperiencePage.tsx` línea 6 (`import { auroraStoryPackage }`) y línea 14 (`useExperience(auroraStoryPackage)`) → reemplazados por el switch sobre `useResolvedStory`.
- `auroraStory.ts` → **se conserva pero se estrecha su uso** al único branch `kind:"local"` (demo sin tripId). Deja de ser el default de todo trip. (Decisión D6 abajo — **CERRADA: se conserva**.)

---

## 3. Catálogo real

**Backend — registro extensible en `platformStories.js`:** reemplazar la constante única por un mapa `storyId → { packageUrl }`:

```js
const BASE_STORY_REGISTRY = {
  'ba-2026': { packageUrl: new URL('../src/story/data/story-ba2026.json', import.meta.url) },
  // 'rio-2027': { packageUrl: new URL('../src/story/data/story-rio2027.json', import.meta.url) }
};
```
- `listBaseStories()` → itera el registro (hoy devuelve 1, mañana N).
- `getBaseStory(storyId)` → lookup en el registro; carga+cachea el package por id; `null` si la clave no existe.
- Cache: `Map<storyId, StoryPackage>` (hoy es una var suelta `cachedBaseStoryPackage`).

**Segunda historia sin tocar `ExperiencePage` (contrato exacto):** agregar (a) el JSON curado, (b) una entrada en `BASE_STORY_REGISTRY`, y (c) una regla destino→id en `deriveBaseStoryId` (ver abajo). `ExperiencePage`, `connected` y la API quedan intactos: solo cambia contenido/config. ✔ cumple criterio de éxito.

**`deriveBaseStoryId` extensible (`platformTrips.js`):** pasar del `if isBuenosAires` fijo a una tabla:
```js
const DESTINATION_STORY_MAP = [
  { storyId: 'ba-2026', match: (d) => d.countryCode === 'AR' && d.cityName.trim().toLowerCase() === 'buenos aires' },
];
// primer match gana; sin match → null
```

**Validación de ids:**
- **Inexistente:** `getBaseStory` → `null` → API 404 → `useStoryContent` mapea a `EMPTY` → fallback honesto.
- **Duplicado:** guard `assertUniqueStoryIds(registry)` al cargar el módulo (las claves de objeto se pisan silenciosas; el guard lista claves repetidas y lanza en arranque). También validar que todo `storyId` de `DESTINATION_STORY_MAP` exista en `BASE_STORY_REGISTRY`.

**Tipado estricto + API pequeña (cliente):** `ConnectedStory` (`connected/types.ts`) hoy es laxo. Añadir `storyPackage?: StoryPackage` (importando el type de `@/features/story/engine/types`). `experience` valida defensivamente con `loadStoryPackage(story.storyPackage)` antes de montar (el backend ya validó; esto blinda el `unknown`). Ningún endpoint nuevo — se reusan `/api/stories/base` y `/api/stories/[storyId]`.

---

## 4. Fallback honesto para destinos sin historia

**Dos señales DISTINTAS, no una (ambas reusan lo existente en `connected`):**
- **`empty`** — el trip EXISTE pero no tiene historia resoluble: `useStoryContent(context).status === ContentStatus.EMPTY`, disparado por (a) `trip.baseStoryId === null` o (b) `getStory` devuelve 404 (`useConnectedContent.ts:54-63`). Cubre el spec `missing-story-fallback`.
- **`not-found`** — el trip MISMO no existe o no es accesible al usuario: `useConnectedTrip(tripId).status === TripContextStatus.NOT_FOUND` (getTrip 404/403, `useConnectedTrip.ts:32-38`). Cubre el "honest not-found state" del spec `trip-story-navigation`. NO se confunde con `error` técnico ni con `empty`.

Ambas señales YA existen en `connected`; `useResolvedStory` solo las expone **sin colapsarlas** (ver §2). No se inventa estado nuevo en la capa de datos.

**Dónde vive y cómo se comunica:**
- **Prevención primaria (Portada `/trips/:tripId`):** con `empty`, la Portada renderiza un estado honesto "tu historia todavía no está lista" y **no muestra el CTA "Entrar al viaje"**. Con `not-found` la Portada no puede resolver el trip → estado honesto equivalente (sin CTA). (Mecanismo, no copy final.)
- **Guarda defensiva (URL directa a `/experience?tripId=`):** `ExperiencePage` renderiza el **mismo componente `ExperienceUnavailable`** para `kind === "empty"` y `kind === "not-found"`, pero con una **prop `variant: "empty" | "not-found"`** que selecciona el mensaje correcto. Son señales distintas con copy distinto — acá se define solo el MECANISMO (la prop), no el copy final. Nunca monta `useExperience`, nunca carga BA; siempre ofrece enlace de vuelta a la Portada / lista.

Regla dura: `experience` **jamás** usa `auroraStoryPackage` cuando hay `tripId`. El demo BA solo existe en `kind:"local"` (sin `tripId`).

---

## 5. Flujo de navegación

```
Wizard (SummaryStep "Comenzar") 
   └─> phase="beginning" → StoryBeginning.run() = createTrip()  ─POST /api/trips─┐
                                                                                  │ trip
   StoryBeginning.onSuccess(trip)  ── navigate(`/trips/${trip.id}`, SPA) ─────────┘
                                                   │
                                                   ▼
                          TripHomePage  (Portada del viaje creado — NUEVA ruta)
                          useConnectedTrip(tripId) + useStoryContent
                             ├─ story RESOLVED → CTA voluntario "Entrar al viaje"
                             │        └─ navigate(`/experience?tripId=`, SPA)
                             │                 └─> ExperiencePage → Cover.tsx (intro) → Experience real
                             └─ story EMPTY   → estado honesto (sin CTA de Experience)
```

**Cambios concretos:**
- **`StoryBeginning.tsx` / `CreateTripWizard.tsx`:** `handleStorySuccess(trip)` deja de llamar `onDone()` (que volvía a la lista) y navega SPA a `/trips/${trip.id}` con `useNavigate`. `onDone`/`onCancel` de cancelación se mantienen para "salir del wizard". Sin condición de carrera nueva: `run()` ya resuelve el trip antes de `onSuccess`.
- **`ActiveTripHome.tsx`:** el `<a href={tripUrl(trip.id)}>` (hard nav) se reemplaza por navegación SPA (`useNavigate` o `<Link>`) hacia `/experience?tripId=` y su CTA se vuelve **story-aware** (solo se muestra si la story está RESOLVED). En la lista general (`TripsPage`) el mismo componente enlaza a la Portada `/trips/:id` (`tripHomeUrl`), no directo a la Experience.
- **Evitar volver a la lista:** al navegar por router (`navigate('/trips/:id')`) tras `StoryBeginning`, el usuario aterriza en la Portada del trip, no en `/trips`. La lista general queda como pantalla aparte accesible por back.

---

## 6. Compatibilidad y migración

**Datos actuales:**
- Trips nuevos: ya tienen `baseStoryId` persistido (`ba-2026` o `null`). ✔
- Trips legacy (`destination` string, sin fechas): sin `baseStoryId` → tratado como `null` → `EMPTY` honesto. No rompen.
- `storyPackageId`: siempre `null`, nunca leído → se deja de escribir; docs viejos quedan inertes. **Sin backfill ni migración destructiva.**

**Fixtures/mocks/tests a actualizar (nombrados):**
- `app/src/features/dev/StatesGallery.tsx` — sample trips ya usan `baseStoryId`; agregar (opcional) un estado de Portada. Sin cambio obligatorio de datos.
- `app/src/features/trips/components/ActiveTripHome.test.tsx` — el assert sobre `<a href>` pasa a navegación SPA (envolver en router) + CTA story-aware.
- `app/src/features/trips/components/wizard/StoryBeginning.test.tsx` — `onSuccess` ahora navega; mockear `useNavigate`.
- `app/src/features/trips/components/TripEntry.test.tsx`, `initialDestination.test.ts` — fixtures con `baseStoryId`, sin cambio salvo que se toque el enlace.
- `app/lib/platformTrips.test.js` — no asevera `storyPackageId` (verificado); revisar el test de `createTripDocument` (~línea 222) sigue verde tras quitar el campo.
- `app/lib/platformStories.test.js` — extender: lookup por registro, id inexistente → `null`, guard de duplicados.

**BA durante la transición:** `baseStoryId 'ba-2026'` → registro → package `story-ba-2026` → Experience. Debe probarse E2E con el trip real BA.

**Scope de progreso/recuerdos/fotos (Decisión D3):** el store scope pasa de `storyPackage.storyId` fijo a `scopeId = tripId ?? storyPackage.storyId`. Trips conectados quedan independientes; el demo local mantiene `story-ba-2026`. **Se acepta el reset del progreso legacy** keyed en `story-ba-2026` para trips conectados (avalado por el riesgo "Progreso local atado al storyId fijo" de la propuesta) — **decisión CERRADA**. El token de sync (`syncNow`) usa el mismo `scopeId`; su re-keyeo es un **riesgo conocido NO bloqueante** fuera de alcance de este cambio (ver §10, Épica 5 de sync).

---

## 10. Arquitectura actual vs objetivo

### Actual (bug)
```
Trip.baseStoryId  ──(IGNORADO)──X
Trip.storyPackageId = null      X  (muerto)

ExperiencePage ─import fijo→ auroraStory.ts → story-ba2026.json
      │
      ▼
useExperience(auroraStoryPackage)   scopeId = "story-ba-2026" (FIJO)
      │
      ▼
progress / memory / photo  ← SIEMPRE "story-ba-2026"
      ⇒ TODO trip renderiza Buenos Aires
```

### Objetivo
```
Trip.baseStoryId (canónico, server-derived)
      │
      ▼
[connected]  useConnectedTrip(tripId) → useStoryContent → GET /api/stories/:baseStoryId
             (getTrip 404/403 → NOT_FOUND; red/técnico → ERROR)   │
                                                     platformStories REGISTRY (id→package)
                                                                  │
      ┌─────────────────────────────────────────────── story.storyPackage (validado)
      ▼
[experience]  useResolvedStory  (thin, sin red; lee status CRUDO de useConnectedTrip)
      ├─ ready     → useExperience(storyPackage, scopeId=tripId) → Cover → Experience REAL
      ├─ empty     → ExperienceUnavailable variant="empty" / Portada honesta   (NUNCA BA)
      ├─ not-found → ExperienceUnavailable variant="not-found"                 (NUNCA BA)
      ├─ loading   → loading cinematográfico
      ├─ error     → estado honesto (fallo técnico real)
      └─ local     → demo BA explícito (solo sin tripId)
```

### Flujo de datos completo (creación → render + fallback)
```
Wizard.createTrip ─POST /api/trips─> normalizeTripInput → deriveBaseStoryId(destination)
                                       (BA→'ba-2026' | otro→null)   [storyPackageId eliminado]
        │ trip{ id, baseStoryId }
        ▼
StoryBeginning.onSuccess ─navigate(/trips/:id)─> TripHomePage (Portada)
        │  useConnectedTrip + useStoryContent
        ├─ RESOLVED → CTA "Entrar" ─navigate(/experience?tripId=)─> ExperiencePage
        │                                          useResolvedStory=ready → Cover → Experience
        │                                          progress/memory/photo scope = tripId
        ├─ EMPTY   → Portada honesta (sin CTA)  ── URL directa a /experience → ExperienceUnavailable variant="empty"
        └─ trip 404/403 → useConnectedTrip=NOT_FOUND ── /experience?tripId=inexistente → ExperienceUnavailable variant="not-found"
```

### Decisiones de arquitectura (ADR)

| # | Decisión | Alternativa rechazada | Rationale |
|---|----------|-----------------------|-----------|
| D1 | Campo canónico = `baseStoryId` | `storyPackageId` / nombre nuevo | Ya vivo en `connected`+backend+API; menor superficie de cambio; `storyPackageId` está muerto |
| D2 | `experience` consume `connected`, no re-fetchea | Duplicar `getStory` en `experience` | Un solo dueño de red/cache; evita lógica divergente |
| D3 | Store scope = `tripId ?? storyPackage.storyId` | Seguir con `storyPackage.storyId` | Progreso/recuerdos por-trip independientes (criterio de éxito); local sigue igual |
| D4 | Catálogo = registro `id→packageUrl` en backend | Mapa en cliente / archivos por convención | Punto único de verdad server-side; 2ª historia = solo contenido+config |
| D5 | Portada por trip en ruta dedicada `/trips/:tripId` (**nombre confirmado, no `/trip/:tripId`**) | Reusar TripsPage con estado seleccionado | Deep-link, SPA reactivo, separa Portada de la lista; reusa `ActiveTripHome` |
| D6 | Conservar demo BA solo en `kind:"local"` (**CERRADA**) | Eliminar `auroraStory.ts` | Preserva contrato "Aurora 100% local" del router; aislado del path de trips |
| D7 | Navegación SPA (`useNavigate`/`Link`) | Mantener `<a href>` | `useTripId` ya es reactivo (`useSearchParams`); sin remount ni bloqueador |
| D8 | 6º estado `not-found` en `useResolvedStory`, derivado del `status` CRUDO de `useConnectedTrip` | Colapsarlo en `empty`, o en `error` (comportamiento actual de `contextGate`/`combineReadiness`) | El spec `trip-story-navigation` exige un "honest not-found state" distinto del vacío y del crash técnico: un trip inexistente/inaccesible (404/403) NO es un trip sin historia (`empty`) NI un fallo de red (`error`). La señal YA existe (`TripContextStatus.NOT_FOUND`); solo hay que dejar de colapsarla en la capa `experience` |

### Archivos a crear/modificar (rutas reales)

**Crear:**
- `app/src/features/experience/hooks/useResolvedStory.ts` — orquestador thin (tripId+connected → estado discriminado).
- `app/src/features/experience/components/ExperienceUnavailable.tsx` — estado honesto por URL directa; acepta prop `variant: "empty" | "not-found"` (copy/mensaje distinto por caso). Cubre tanto el trip sin historia (`empty`) como el trip inexistente/inaccesible (`not-found`). Un solo componente, dos variantes.
- `app/src/features/trips/pages/TripHomePage.tsx` — Portada del viaje (`/trips/:tripId`), story-aware.
- `app/src/features/trips/pages/TripHomePage.test.tsx` — cobertura de estados READY/EMPTY.
- `app/src/features/experience/hooks/useResolvedStory.test.tsx` — cobertura de los **6 kinds**, con caso explícito que verifica que `not-found` (getTrip 404/403) NO se confunda con `empty` ni con `error`.

**Modificar (backend):**
- `app/lib/platformStories.js` — registro `id→package`, `list/get` sobre el registro, cache `Map`, guard de duplicados.
- `app/lib/platformTrips.js` — quitar `storyPackageId: null`; `deriveBaseStoryId` como tabla destino→id.
- `app/lib/platformStories.test.js`, `app/lib/platformTrips.test.js` — cobertura registro + quitar campo muerto.

**Modificar (cliente):**
- `app/src/features/experience/pages/ExperiencePage.tsx` — switch sobre `useResolvedStory` (elimina import fijo).
- `app/src/features/experience/hooks/useExperience.ts` — firma `useExperience(storyPackage, scopeId)`; keyear stores/sync/theme/intro por `scopeId`.
- `app/src/features/experience/data/auroraStory.ts` — uso estrechado al branch local (o eliminar si D6 se descarta).
- `app/src/features/connected/types.ts` — `ConnectedStory.storyPackage?: StoryPackage`.
- `app/src/app/router.tsx` — ruta `/trips/:tripId` (RequireAuth+RequireOnboarding, lazy `TripHomePage`).
- `app/src/features/trips/lib/tripUrl.ts` — añadir `tripHomeUrl(id)=/trips/:id`; `tripUrl` sigue = entrada a Experience.
- `app/src/features/trips/components/ActiveTripHome.tsx` — CTA story-aware + navegación SPA.
- `app/src/features/trips/components/CreateTripWizard.tsx` — `handleStorySuccess` navega a `/trips/:id`.
- `app/src/features/trips/pages/TripsPage.tsx` — card de trip activo enlaza a Portada `/trips/:id`.
- Tests: `ActiveTripHome.test.tsx`, `StoryBeginning.test.tsx` (navegación/CTA).

### Orden de implementación (arquitectónico, no rompe nada)

1. **Backend catálogo + limpieza canónica** — registro en `platformStories`, `deriveBaseStoryId` tabla, quitar `storyPackageId`. Aditivo: BA sigue resolviendo. → `npm run test`.
2. **Tipado cliente** — `ConnectedStory.storyPackage`. Aditivo. → `npm run typecheck`.
3. **`useExperience(storyPackage, scopeId)`** — `scopeId` opcional con default `storyPackage.storyId` (backward-compatible). → `typecheck` + `test:react`.
4. **`useResolvedStory` + `ExperiencePage` resolver + `ExperienceUnavailable`** — el fix núcleo. → `test:react` + E2E manual del trip BA.
5. **Navegación** — `TripHomePage` + ruta, `ActiveTripHome` SPA/story-aware, `tripHomeUrl`, wizard→Portada. → `test:react` + `test:e2e`.
6. **Cierre** — actualizar fixtures/tests, estrechar `auroraStory.ts`. → suite completa + `build`.

### Riesgos técnicos (más específicos que la propuesta)

- **`story.storyPackage` llega como `unknown`** — sin `loadStoryPackage` defensivo en cliente, un package malformado revienta `useExperience`. Mitigar validando antes de montar.
- **Cambio de scope a `tripId` desacopla el token de sync (Épica 5)** — `syncNow` re-keyea; el backend `api/aurora/*` no está validado en vivo. Progreso legacy queda huérfano (reset aceptado, D3). **Riesgo conocido NO bloqueante**, fuera de alcance de este cambio — se revisa en el trabajo futuro de la Épica 5 de sync; NO bloquea `sdd-apply`.
- **`not-found` se pierde si se deriva desde el lugar equivocado** — `useStoryContent` (`contextGate`) y `combineReadiness` colapsan `NOT_FOUND`→`ERROR`. `useResolvedStory` DEBE leer el `status` crudo de `useConnectedTrip`, o el "honest not-found state" volvería a caer en `error`. Cubierto por el test de los 6 kinds.
- **Intro/Cover atada a `scopeId`** — `introSeenKey`/`themeStorageKey` cambian de valor al pasar de `story-ba-2026` a `tripId`; verificar que la intro cinematográfica dispare bien en navegación SPA (sin remount de `#app`).
- **`ActiveTripHome` duplicado entre lista y Portada** — divergencia si no se reusa el mismo componente. Mantener un solo componente parametrizado.
- **Registro con id duplicado se pisa silenciosamente** — guard explícito obligatorio.
- **Ruta `/trips/:tripId` vs matching de `/trips`** — asegurar orden/definición correcta en el router para no capturar la lista.

### Decisiones cerradas (antes "Open Questions")

Todas las preguntas fueron resueltas por el usuario. **Ninguna bloquea `sdd-apply`.**

- [x] **Estado `not-found` separado (D8):** CERRADA — se agrega el 6º estado a `useResolvedStory`, derivado del `status` crudo de `useConnectedTrip` (ver §2 y §4). Distinto de `empty` y de `error`.
- [x] **Demo local sin `tripId` (D6):** CERRADA — se mantiene BA como demo en `kind:"local"`; `auroraStory.ts` se conserva acotado a ese branch. Honra el contrato "Aurora 100% local".
- [x] **Reset de progreso legacy** keyed `story-ba-2026` para trips conectados: CERRADA — se acepta el reset (avalado por la propuesta; ver §6 y D3).
- [x] **Nombre de ruta (D5):** CERRADA — se confirma `/trips/:tripId` (no `/trip/:tripId`).

**Riesgo conocido NO bloqueante (fuera de alcance de este cambio):**
- **Sync token (Épica 5):** el token de `syncNow` re-keyea al pasar el scope a `tripId`, y el backend `api/aurora/*` no está validado en vivo. NO se resuelve activamente en este cambio y NO bloquea `sdd-apply` — se revisa en el trabajo futuro de la Épica 5 de sync. El progreso legacy huérfano ya está cubierto por la decisión de reset (D3).

### Estrategia de rollback (por pieza)

- **Backend registro:** revertir a `getBaseStory` de historia única; BA sigue resolviendo (el registro es superset).
- **`ExperiencePage`:** restaurar `useExperience(auroraStoryPackage)` con import fijo → vuelve el comportamiento actual (BA siempre). Es el rollback documentado en la propuesta.
- **`scopeId`:** al ser param con default, no pasarlo restaura el keyeo por `storyPackage.storyId`.
- **Navegación:** revertir ruta `/trips/:tripId` y `ActiveTripHome` a `<a href>`; todo detrás de la rama feature.

### Comandos de validación (por cambio)

| Cambio | Comando |
|--------|---------|
| Backend (`platformStories`/`platformTrips`) | `npm run test` (node --test lib/**) |
| Tipos/hooks/componentes TS | `npm run typecheck` + `npm run test:react` (vitest) |
| Navegación/routing | `npm run test:e2e` (playwright) + `npm run build` |
| Pre-merge (todo) | `npm run typecheck && npm run test && npm run test:react && npm run build` |

## Migration / Rollout

Sin migración destructiva. `baseStoryId` ya está persistido; legacy sin él → `EMPTY` honesto. Cambio detrás de rama feature; rollback pieza por pieza (arriba). El único efecto observable en datos existentes es el reset de progreso local para trips conectados (aceptado).
