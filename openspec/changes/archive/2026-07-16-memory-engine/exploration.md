# Exploration: Memory Engine

> **Revisar primero:** el veredicto y la costura recomendada. El motor debe ser un dominio puro nuevo, pero sus records deben persistirse mediante un adaptador sobre la colección `memories` ya existente y autenticada; no debe abrir otra colección, otro álbum ni otro store local.

## Current State

### Veredicto

La base permite implementar la etapa sin tocar Living Context, Decision Engine, Companion, Editorial Voice ni Story Package. La entrada más segura es una frontera estructural de `CompanionAction` + `EditorialMessage`, correlacionada por `actionId/decisionId/kind`, y un conjunto cerrado de eventos autorizados. El core clasifica significado; un puerto separado persiste únicamente `MemoryRecord` aceptados.

La persistencia reutilizable es la plataforma autenticada por viaje: `platformMongo` ya expone `memories`, `trips` y `tripStates`; `requireTripMember/requireTripRole` ya resuelve usuario, viaje y rol; y el índice único `(tripId, legacyId)` ya ofrece una base de idempotencia. No es seguro crear una colección `memoryRecords`, otro `localStorage` ni reutilizar Cloudinary.

### Evidencia de arquitectura previa

| Área | Estado comprobado | Consecuencia para Memory |
|---|---|---|
| Living Context | `app/src/features/context-engine/livingContext.ts`, `types.ts` y módulos temporal/weather producen contexto dinámico y provenance. | No importar, consultar ni persistir sus snapshots, freshness, cotizaciones o clima. |
| Decision Engine | `decision/contracts.ts` define cinco kinds y `ActDecision` con `id`, `dedupeKey`, window, evidence y payload. | No reevaluar reglas ni copiar payload/evidence. Conservar sólo una referencia mínima a la decisión. |
| Companion | `companion/contracts.ts` entrega `CompanionAction`; `orchestrator.ts` ya valida vigencia, dedupe y frecuencia. | Consumir sólo acciones, nunca silencios. No convertir historial Companion en historial de recuerdos. |
| Editorial Voice | `editorial/contracts.ts` entrega texto curado seguro y `actionRef`; `editorialVoice.ts` correlaciona action/decision y no interpola PII. | Validar lineage exacto y copiar sólo texto + referencias editoriales permitidas. |
| Story Package | `story/engine/types.ts`, `storyPackage.ts` y `platformStories.js` separan contenido curado (`storyId/baseStoryId`) del viaje. | `storyId` es asociación narrativa, no ownership; no modificar ni derivar recuerdos desde el package. |

Hay una restricción real adicional: `companion/boundaries.test.ts` recorre todo `context-engine` fuera de `/companion` y rechaza imports hacia Companion. Por eso Memory debe declarar/validar una forma estructural mínima compatible, como ya hace Editorial, en vez de importar el runtime o cambiar ese test.

### Datos y persistencia existentes

| Recurso | Evidencia | Reuso / prohibición |
|---|---|---|
| Álbum `Memory` | `album/data/{types,memoryStore}.ts`: nota/fotos, favorito, archivo; localStorage por scope. | No insertar records semánticos en esa forma: aparecerían como recuerdos vacíos o alterarían el álbum. Reusar la infraestructura remota, no la vista ni el CRUD visual. |
| Favoritos | `experience/lib/favoritesStore.ts`: `{targetId, createdAt}`, idempotente y scopeado por trip. | Puede originar `favorite_marked` mediante adapter; el target debe ser ID curado, nunca label/texto. |
| Notas privadas | `notesStore.ts`: texto libre privado; no existe `memorable`. | No autorizar notas todavía y nunca copiar texto. `note_marked_memorable` no es representable hoy. |
| Progreso | `story/engine/progressStore.ts`: transición a `started/completed`, scope trip en Experience. | `first_chapter_opened` es representable sólo si la transición emite un evento explícito; no inferir escaneando el mapa. |
| Sync local | `features/sync/syncClient.ts` sincroniza progreso/álbum con `/api/alaia/sync`. | No extender esta vía legacy por token para records personales. Además, el cliente conectado aún no consume `/api/trips/:tripId/sync`. |
| Sync de plataforma | `routes/trips/[tripId]/sync.js` + `lib/platformSync.js`: auth por miembro, Mongo y unique `(tripId, legacyId)`. | Costura de persistencia reutilizable; debe filtrar por discriminador para que records semánticos no entren al payload del álbum. |
| Mongo plataforma | `lib/platformMongo.js`: colección `memories` canónica y ownership de viaje vía `trips.members`. | Usar la misma colección mediante adaptador; no sumar colección ni conexión. |
| Cloudinary/media | `platformMedia.js`, rutas `media*`, `photoStore.ts`. | No aplica: Memory Record no contiene blobs, URLs, coordenadas ni metadata de provider. |

Riesgo de privacidad existente que la implementación debe aislar: `/api/memories` y `/api/memories/:id` usan `lib/mongodb.js`, apuntan a la misma colección nominal y no autentican. Antes de guardar records semánticos allí, esas rutas y el sync de álbum deben excluir explícitamente el discriminador de Memory Engine; los records nunca deben tener el campo legacy `id` que consumen esas rutas.

### Eventos realmente representables

| Categoría solicitada | Estado | Decisión v1 |
|---|---|---|
| Inicio del viaje | `trip_start_today` existe en Companion + Editorial. | Aceptar. `trip_start_tomorrow` es anticipación, no inicio persistido. |
| Último día | `trip_last_day` existe en Companion + Editorial. | Aceptar. |
| Última intervención editorial | Existe el par Action/Message, pero persistir cada intervención sería un log. | No crear record duplicado: el record de hito conserva la referencia/texto editorial y una lectura posterior puede elegir el más reciente. |
| Favorito significativo | El favorito es una señal explícita y tiene target/fecha. | Aceptar sólo `favorite_marked` autorizado, sin label ni payload. |
| Primer capítulo abierto | `markChapterStarted` materializa la transición. | Aceptar sólo evento explícito `chapter_opened`; dedupe por slot “first”. |
| Fin del viaje | Hay fecha de fin, pero no evento autorizado ni decisión `trip_ended`. | Diferir; no recalcular fechas dentro de Memory. |
| Nota memorable | No existe flag/acción “memorable”. | Diferir; no tratar toda nota privada como recuerdo. |
| Primer momento importante | No existe señal estructurada de importancia. | Diferir; no inferir desde copy, fotos o Story Package. |

Weather/light actions, cotizaciones, contexto temporal, abstenciones, errores y observabilidad se descartan siempre, aunque tengan EditorialMessage.

## Affected Areas

- `app/src/features/context-engine/memory/` — dominio puro propuesto: contratos, policy, lifecycle, privacidad, dedupe y tests; único consumidor conceptual de las fronteras previas.
- `app/lib/platformMemory.js` — adaptador propuesto sobre `getMemoriesCollection`, sin colección nueva.
- `app/routes/trips/[tripId]/sync.js` y `app/lib/platformSync.js` — partición explícita entre Album Memory y semantic records para impedir mezcla o exposición.
- `app/routes/memories.js` y `app/routes/memories/[id].js` — guard negativo obligatorio para que la API legacy global nunca liste ni mutile records semánticos.
- `app/src/features/experience/lib/{favoritesStore.ts}` y `story/engine/progressStore.ts` — fuentes representables para adapters futuros; no deben ser modificadas para el core inicial salvo que se active una integración explícita.

## Approaches

1. **Colección `memories` compartida y particionada por discriminador** — records semánticos con `recordKind: "alaia_memory_record_v1"`; Album/legacy los excluyen.
   - Pros: reutiliza Mongo, auth, ownership e índice existentes; no crea segundo sistema; rollback acotado.
   - Cons: exige filtros defensivos en todos los lectores existentes y tests de no-exposición.
   - Effort: Medium.

2. **Campo embebido en `tripStates`** — guardar `memoryRecords[]` junto al progreso.
   - Pros: aislamiento del álbum y una fila por trip.
   - Cons: crea un segundo modelo/repositorio encubierto, complica dedupe concurrente y mezcla progreso compartido con recuerdos personales.
   - Effort: Medium; rechazada.

3. **Extender el `Memory` del álbum/localStorage** — añadir metadata semántica al modelo visible y sincronizarlo igual.
   - Pros: mínimo backend nuevo.
   - Cons: contamina álbum, mezcla media/notas con significado, no expresa ownership personal y arrastra payloads privados.
   - Effort: High; rechazada.

## Recommendation

### Flujo y contratos recomendados

```text
trusted MemoryScope + (CompanionAction + EditorialMessage | AuthorizedMemoryEvent)
  -> validate lineage/ownership -> MemoryCandidate
  -> deterministic retention policy -> MemoryDiscard | AcceptedCandidate
  -> MemoryRepository.persistOnce -> MemoryRecord(state=persisted/remembered)
```

Contratos cerrados, readonly y sin payloads abiertos:

```ts
type MemoryType = "trip_started" | "trip_last_day" | "favorite_marked" | "first_chapter_opened";
type MemoryOrigin = "companion_editorial" | "authorized_event";
type RetentionReason = "trip_milestone" | "explicit_affinity" | "first_story_open";
type DiscardReason = "invalid_input" | "lineage_mismatch" | "unsupported_kind" |
  "transient_context" | "not_first" | "duplicate" | "privacy_rejected";

interface MemoryScope {
  readonly ownerUserId: string; // inyectado por auth, nunca aceptado desde payload cliente
  readonly tripId: string;
  readonly storyId: string | null;
}
interface AuthorizedMemoryEvent {
  readonly eventId: string;
  readonly kind: "favorite_marked" | "chapter_opened";
  readonly occurredAt: string;
  readonly targetRef: string;
}
interface MemoryRecord {
  readonly recordKind: "alaia_memory_record_v1";
  readonly memoryKey: string; // hash opaco estable
  readonly type: MemoryType;
  readonly origin: MemoryOrigin;
  readonly occurredAt: string;
  readonly createdAt: string;
  readonly owner: Readonly<{ userId: string }>;
  readonly tripRef: Readonly<{ tripId: string }>;
  readonly storyRef: Readonly<{ storyId: string }> | null;
  readonly decisionRef: Readonly<{ id: string; kind: string }> | null;
  readonly editorialRef: Readonly<{ catalogVersion: string; variantId: string }> | null;
  readonly evidence: readonly Readonly<{ kind: string; ref: string }>[];
  readonly meaning: Readonly<{ code: MemoryType; text: string | null }>;
  readonly state: "persisted" | "remembered" | "archived";
  readonly retentionReason: RetentionReason;
}
```

`MemoryCandidate` y `MemoryDiscard` son resultados efímeros y explicables. `accepted` es una transición del proceso, no un documento. El adapter asigna `persisted`; `remembered` puede ser la proyección de lectura confirmada. `archived` se define en el contrato, pero no se programa ni ejecuta automáticamente.

### Ownership y privacidad

- `owner.userId` proviene exclusivamente de la sesión; `tripRef` debe corresponder a un viaje donde ese usuario es miembro.
- `storyRef` sólo contextualiza el relato; Story Package nunca posee records ni se modifica.
- Guardar sólo IDs mínimos, reason codes y texto editorial curado. No email, token, coordenadas, destination/accommodation, note text, fotos, weather, quotes, payload/evidence completos, observer ni errores.
- Clonar/freeze en el core y validar claves exactas. Cualquier getter, campo adicional, mismatch Action/Message o evento no cerrado produce `MemoryDiscard`, no excepción observable ni persistencia parcial.

### Dedupe y persistencia

Construir una tupla canónica versionada por ownership + scope + significado + fuente; hashearla de forma estable y persistir sólo el hash opaco. Para hitos Companion la fuente es `decisionRef.id`; para favorito, `targetRef`; para primer capítulo, usar un slot estable por owner/trip/story, no `eventId`. Reintentos producen la misma key.

El adaptador guarda en la colección `memories` existente con `legacyId = "semantic-v1:" + memoryKey` para aprovechar el unique `(tripId, legacyId)` y `recordKind` para partición. Un duplicate-key se convierte en `MemoryDiscard(reason="duplicate")`. No hay read-before-write como autoridad, ni append de eventos, ni segunda colección. Las queries de álbum, sync y API legacy deben filtrar `recordKind` en ambos sentidos.

### Boundaries y pruebas necesarias

- Core sin React, UI, Story Package, providers, storage, fetch, Mongo, Cloudinary, Push, cron, IA, LLM, prompts, embeddings o vector DB.
- Tests de los cuatro tipos aceptados, todos los descartes, Action/Message lineage, ownership confiable, lifecycle completo, freeze/no mutación, hashes estables, reintentos/concurrencia y duplicate-key.
- Contract tests del adapter y consultas negativas que demuestren que Album Sync y `/api/memories` no ven records semánticos.
- Privacy table-driven tests que inyecten email, token, coordenadas, notas, weather, payloads, errors y campos extra y prueben que no llegan al documento.
- No ejecutar build ni activar consumidor/UI en esta etapa.

## Risks

- La colección `memories` tiene dos generaciones de API; sin discriminador y filtros cerrados habría exposición o mezcla de records.
- El sync conectado de plataforma existe en backend, pero `syncClient.ts` aún usa la ruta legacy `/api/alaia/sync`; no debe aprovecharse esa divergencia para introducir un segundo camino.
- `first_chapter_opened` y `favorite_marked` requieren eventos explícitos en el borde; escanear stores convertiría Memory en polling/log e impediría ownership preciso.
- `trip_ended`, `note_marked_memorable` y `first_important_moment` no son representables hoy. Implementarlos sin una señal nueva inventaría recuerdos.
- Un hash corto no es suficiente para unicidad persistente; el diseño debe fijar algoritmo y canonicalización antes de tasks.

## Ready for Proposal

**Yes.** La propuesta debe fijar el alcance v1 en cuatro categorías, el adapter compartido sobre `memories`, la partición obligatoria de lectores legacy/álbum y el descarte cerrado de toda señal transitoria. Debe mantener sin cambios las cinco etapas anteriores y diferir explícitamente las categorías sin evento autorizado.
