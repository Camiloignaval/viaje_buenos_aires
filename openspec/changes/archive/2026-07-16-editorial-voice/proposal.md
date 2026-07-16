# Proposal: Editorial Voice

## Intent

**Hoy**, Companion Orchestrator emite `CompanionAction`, pero no existe una voz editorial aislada. **Propuesto**: transformar sólo acciones válidas en mensajes curados y reproducibles, sin decidir, consultar contexto ni autorizar delivery.

## Scope

### In Scope
- Contrato puro `CompanionAction -> EditorialMessage`, con error tipado y fail-closed ante input, kind o catálogo inválido.
- Catálogo `editorial-v1`, `es-CL`, exhaustivo para cinco `DecisionKind`, con variantes fijas y máximo 160 code points Unicode.
- Selección determinista por identidad estable no sensible y versión; sin `Math.random`, reloj ni estado global.
- Validación de tono, longitud, placeholders y drift; observación categórica.

### Out of Scope
- IA, prompts, generación libre, personalización, texto de usuario o placeholders dinámicos.
- Living Context, Story, providers, decisiones, UI, Push, delivery, persistencia o cambios previos.
- Archive, push, tags o Etapa 7.6.

## Capabilities

### New Capabilities
- `editorial-voice`: contratos, catálogo versionado, selección reproducible, validación editorial y error contractual cerrado.

### Modified Capabilities
- None.

## Approach

Crear `app/src/features/context-engine/editorial/` con contratos inmutables, catálogo por `DecisionKind`, hash estable, validador e interpolador estricto. `EditorialMessage` incluirá identidad, versión, variante, locale, texto y referencias/clasificación futuras, nunca destino, payload ni autorización.

V1 admite cero placeholders: cualquier `{token}` falla. Queda una allowlist/interpolación cerrada futura, sin ampliar contratos upstream. IDs y dedupe pueden seleccionar variante, pero jamás aparecer en texto u observer. No habrá fallback entre kinds.

El tono será cálido, elegante, breve, optimista y contemplativo; sin voseo, dramatismo, imperativos, urgencia ni `debes`, `no olvides`, `tienes que`, `urgente`, `importante`, `alerta`, comparadas normalizando caso y diacríticos.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `app/src/features/context-engine/editorial/` | New | Contratos, catálogo, validación, observer y tests |
| `app/src/features/context-engine/companion/` | Unchanged | Única fuente de `CompanionAction` |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Drift semántico/editorial | Medium | Catálogo por kind, fixtures explícitos y versionado |
| Identificadores sensibles expuestos | Medium | Seed opaco; nunca texto, observer ni logs |
| Validación de tono incompleta | Medium | Invariantes mecánicas más revisión editorial curada |

## Rollback Plan

Eliminar el subdominio editorial nuevo. No existen consumidores, migraciones ni cambios upstream que revertir.

## Dependencies

- `CompanionAction` verificada. Orden de archive: Foundation -> Weather -> Decision -> Orchestrator -> Editorial.

## Success Criteria

- [ ] Los cinco kinds producen variantes `editorial-v1` reproducibles, inmutables y de hasta 160 code points.
- [ ] Inputs/catalog entries inválidos y placeholders fallan mediante error tipado, sin fallback, throw incidental ni cambio de decisión.
- [ ] Todo texto cumple locale y tono; no filtra IDs ni contiene lenguaje prohibido.
- [ ] Tests prueban determinismo, variación, catálogo exhaustivo, aislamiento y ausencia de IA, contexto, I/O o delivery.
