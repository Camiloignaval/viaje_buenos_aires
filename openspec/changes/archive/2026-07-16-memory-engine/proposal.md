# Proposal: Memory Engine

## Intent

Proponer un dominio puro `memory-engine` que conserve hitos con ownership, privacidad, dedupe y lifecycle explícitos. Hoy Mongo ya posee `memories`; la propuesta reutiliza esa colección mediante un adaptador particionado, sin crear otro sistema ni convertir contexto o datos privados en un log.

## Scope

### In Scope
- Contratos cerrados para `MemoryCandidate`, `MemoryDiscard` y `MemoryRecord`.
- Entradas compatibles estructuralmente con `CompanionAction` + `EditorialMessage`, o eventos autorizados.
- V1: `trip_started`, `trip_last_day`, `favorite_marked` y `first_chapter_opened`.
- Policy determinista, lineage, privacidad, hash, idempotencia y estados `persisted`, `remembered`, `archived` sin archivado automático.
- Adaptador sobre Mongo `memories`, con `recordKind`, ownership autenticado y partición negativa en lectores de álbum/legacy.

### Out of Scope
- `trip_ended`, notas memorables y momentos importantes sin señal autorizada.
- Living Context, clima, Decision, Companion, Editorial, Story Package o contratos upstream.
- IA, LLM, embeddings, vector DB, logs, UI, cron, push, media y contexto dinámico.
- `/api/memories` sin autenticación y Album Sync como vías de escritura semántica.

## Capabilities

### New Capabilities
- `memory-engine`: clasificación, descarte, retención, lifecycle, privacidad, dedupe y persistencia particionada de recuerdos semánticos.

### Modified Capabilities
None.

## Approach

`MemoryScope` confiable más una entrada cerrada produce un candidato efímero. La policy valida claves exactas, lineage y categorías; devuelve descarte explicable o candidato aceptado. Un puerto persiste una vez usando una clave canónica opaca y el índice `(tripId, legacyId)`. `ownerUserId` proviene de sesión y membership. Los lectores legacy y de álbum excluyen `recordKind: "alaia_memory_record_v1"`.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `app/src/features/context-engine/memory/` | New | Core, contratos y pruebas. |
| `app/lib/platformMemory.js` | New | Adaptador Mongo autenticado e idempotente. |
| `app/lib/platformSync.js` | Modified | Partición de records del álbum. |
| `app/routes/memories.js`, `app/routes/memories/[id].js` | Modified | Guard negativo para records semánticos. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Exposición por lectores legacy | High | Discriminador, filtros defensivos y tests negativos. |
| Duplicados concurrentes | Medium | Hash versionado e índice único; traducir duplicate-key a descarte. |
| Captura de datos sensibles | Medium | Allowlist exacta y pruebas table-driven de privacidad. |

## Rollback Plan

Revertir core, adaptador y filtros juntos. Los documentos discriminados permanecen aislados; eliminarlos sólo mediante una operación autenticada.

## Dependencies

- `platformMongo`, sesión autenticada, membership de viaje e índice único existente.

## Success Criteria

- [ ] Las cuatro categorías V1 tienen aceptación/descarte determinista y explicación verificable.
- [ ] Reintentos y concurrencia producen como máximo un record por clave semántica.
- [ ] Ningún dato prohibido llega al documento persistido.
- [ ] Album Sync y `/api/memories` no leen ni mutan records semánticos.
- [ ] Las cinco etapas anteriores permanecen sin cambios.
