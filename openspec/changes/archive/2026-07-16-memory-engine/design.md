# Design: Memory Engine

## Technical Approach

Implementar un dominio puro en `app/src/features/context-engine/memory/`: valida una frontera estructural local, clasifica sólo cuatro significados y produce descarte o candidato inmutable. La aceptación es una transición efímera; un puerto persiste una vez mediante `app/lib/platformMemory.js` sobre Mongo `memories`. Ninguna etapa previa importa Memory ni se modifica.

```text
scope autenticado + (Action+Message | evento autorizado)
  -> validación/privacidad -> Candidate | Discard
  -> Accepted -> MemoryRepository -> persisted -> confirmed read -> remembered
                                      `archive_authorized` -> archived
```

## Architecture Decisions

| Decisión | Elección y razón | Rechazado |
|---|---|---|
| Frontera | Tipos y validadores locales exactos, compatibles estructuralmente con Companion/Editorial; evita invertir imports y preserva sus boundary tests. | Importar/modificar upstream. |
| Alcance V1 | `trip_started` (`trip_start_today`), `trip_last_day`, `favorite_marked`, `first_chapter_opened`. Fin de viaje, mañana, nota memorable, momento importante y “última editorial” quedan diferidos por falta de señal o por convertir Memory en log. Weather/light siempre son transitorios. | Inferencia desde contexto, stores o copy. |
| Store | Un adaptador y discriminador `alaia_memory_record_v1` dentro de `memories`; schema cerrado y ownership verificado. | Segunda colección, localStorage o álbum. |
| Identidad | SHA-256 UTF-8 de `memory-key-v1␟owner␟trip␟story-or--␟type␟origin␟sourceSlot`; `memoryKey=mk1_<hex>`, `legacyId=semantic-v1:<memoryKey>`. `sourceSlot` es decision id, `favorite:<targetRef>` o `first-chapter`. La versión permite evolución; owner/scope/significado/fuente evitan cruces. | Random, timestamp, hash corto o read-before-write. |

## Contracts

```ts
type MemoryType="trip_started"|"trip_last_day"|"favorite_marked"|"first_chapter_opened";
type MemoryOrigin="companion_editorial"|"authorized_event";
type RetentionReason="trip_milestone"|"explicit_affinity"|"first_story_open";
type DiscardReason="invalid_input"|"lineage_mismatch"|"unsupported_kind"|"transient_context"|"not_first"|"duplicate"|"privacy_rejected";
type MemoryScope=Readonly<{ownerUserId:string;tripId:string;storyId:string|null}>;
type AuthorizedMemoryEvent=Readonly<{eventId:string;kind:"favorite_marked"|"chapter_opened";occurredAt:string;targetRef:string}>;
type MemoryClassificationFacts=Readonly<{firstChapterAlreadyOpened:boolean}>;
type MemoryCandidate=Readonly<{outcome:"candidate";lifecycle:"candidate";type:MemoryType;origin:MemoryOrigin;occurredAt:string;scope:MemoryScope;decisionRef:Readonly<{id:string;kind:string}>|null;editorialRef:Readonly<{catalogVersion:string;variantId:string}>|null;evidence:readonly Readonly<{kind:"companion_action"|"favorite_target"|"chapter_target";ref:string}>[];meaning:Readonly<{code:MemoryType;text:string|null}>;retention:Readonly<{reason:RetentionReason;explanation:"travel_milestone_worth_recalling"|"explicit_preference_worth_recalling"|"first_story_step_worth_recalling"}>;dedupe:Readonly<{version:"memory-key-v1";sourceSlot:string}>}>;
type MemoryRecord=Readonly<{recordKind:"alaia_memory_record_v1";memoryKey:string;identityVersion:"memory-key-v1";type:MemoryType;origin:MemoryOrigin;occurredAt:string;createdAt:string;owner:Readonly<{userId:string}>;tripRef:Readonly<{tripId:string}>;storyRef:Readonly<{storyId:string}>|null;decisionRef:MemoryCandidate["decisionRef"];editorialRef:MemoryCandidate["editorialRef"];evidence:MemoryCandidate["evidence"];meaning:MemoryCandidate["meaning"];state:"persisted"|"remembered"|"archived";retention:MemoryCandidate["retention"]}>;
type MemoryDiscard=Readonly<{outcome:"discard";reason:DiscardReason;type:MemoryType|null}>;
```

`MemoryAccepted` replica Candidate con `outcome/lifecycle="accepted"` y nunca se guarda. Entradas inválidas, privacidad, `not_first` y duplicados son `MemoryDiscard`; sólo `MemoryEngineError` lanza `OWNERSHIP_DENIED`, `SCHEMA_REJECTED`, `REPOSITORY_FAILURE` o `INVALID_LIFECYCLE_TRANSITION`, sin payload/error original ni escritura parcial.

## Persistence, Ownership and Privacy

`classifyMemory(scope,input,facts)` recibe `MemoryClassificationFacts` como proyección confiable y efímera; así un capítulo posterior devuelve `not_first` sin consultar stores, mientras la unicidad atómica cubre concurrencia. `MemoryRepository` expone `persistOnce(accepted)` y `getAndRemember(memoryKey, scope)`. El adaptador obtiene `ownerUserId` de sesión, exige membership en `trips`, valida IDs allowlisted (`[A-Za-z0-9._:-]{1,128}`), schema y transiciones. Usa índice único atómico `(tripId, legacyId)`; duplicate-key devuelve `duplicate`. `storyRef` sólo asocia, no posee.

Se rechazan claves extra/getters y email, tokens, coordenadas, notas/cotizaciones, weather, payload/evidence completos, observabilidad y errores. Sólo persisten IDs mínimos y texto editorial curado. `platformSync.js` y `routes/trips/[tripId]/sync.js` filtran el discriminador y el prefijo reservado al leer/escribir; `routes/memories.js` y `routes/memories/[id].js` agregan guard negativo a list/find/update/delete. No se modifica Album, favoritos, progreso ni Story Package.

## File Changes and Tests

| Área | Cambio |
|---|---|
| `memory/{contracts,validation,policy,dedupe,lifecycle,index}.ts` + tests | Core puro, privacidad, hash, lifecycle y boundaries. |
| `lib/platformMemory.js` + test | Membership, schema, SHA-256, upsert y lectura confirmada. |
| `lib/platformSync.js`, sync route, legacy memory routes + tests | Aislamiento bidireccional de particiones. |

Strict TDD: RED/GREEN por contrato, cuatro categorías, todos los descartes, lineage, first-slot, lifecycle, allowlist table-driven, hash fixtures, retries/concurrencia, fallo atómico y coexistencia legacy/álbum/semántica. Verificar `npm run typecheck`, `npm test`, `npm run test:react`, boundary suites y `git diff --check`; nunca build.

## Rollout, Rollback and Risks

Sin migración, UI, consumidor, IA, LLM, embeddings, logs, providers ni archivado automático. Rollback: revertir core, adaptador y filtros juntos; records discriminados quedan aislados. Riesgos residuales: colisión SHA-256 teórica y olvidar un lector futuro; schema, índice y tests negativos los acotan. Previsión >400 líneas: riesgo alto; aplicar tres slices auto-chain autónomos (core, persistencia, aislamiento), cada uno con tests y rollback propio.
