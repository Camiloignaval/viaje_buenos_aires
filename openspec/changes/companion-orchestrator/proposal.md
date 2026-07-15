# Proposal: Companion Orchestrator

## Intent

**Hoy**, `ContextDecisionRun.selected` entrega una decision autorizada, pero ningun consumidor determina si puede ser una intervencion conceptual. **Propuesto**: un orquestador TypeScript puro que la preserve y produzca `CompanionAction | CompanionSilence`, sin entrega ni nueva decision.

## Scope

### In Scope
- Consumir Living Context, `decisionRun.selected`, preferencia global existente, historial inmutable y reloj inyectado.
- Revalidar tipo, vigencia, dedupe y una politica de frecuencia nombrada; explicar accion o silencio.
- Clasificar un canal futuro mediante mapping cerrado por `DecisionKind`, sin payload provider-specific.
- Historial caller-owned: dedupe keys procesadas y acciones recientes; sin DB.

### Out of Scope
- Inspeccionar `evaluations`, crear/promover decisiones, recalcular prioridad o reinterpretar evidencia.
- Copy, IA, UI/Experience, Push/delivery, persistencia, endpoints, providers, configuracion o preferencias nuevas.
- Activar/modificar Companion legacy, Foundation, Weather o Decision Engine.

## Capabilities

### New Capabilities
- `companion-orchestrator`: gating determinista, accion/silencio explicable, frecuencia, historial y canal conceptual.

### Modified Capabilities
- None.

## Approach

Crear `app/src/features/context-engine/companion/` con contratos discriminados, funcion pura, policy y observer sanitizado. `enabled=false` siempre silencia; `selected=null` nunca promueve alternativas; `dedupeKey` se reutiliza y jamas repite.

`CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS` aplica 6 horas entre acciones; una decision distinta `high` puede pasar tras 60 minutos si no hubo otra `high` en ese intervalo. Dedupe, vigencia y expiracion nunca admiten bypass. Priority se conserva, no se puntua. Los canales son labels cerrados, no autorizacion de entrega.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `app/src/features/context-engine/companion/` | New | Contratos, orchestrator, policy, observer y tests puros |
| `app/src/features/context-engine/decision/` | Unchanged | Fuente autoritativa consumida |
| `app/lib/companionEngine.js` | Unchanged | Companion legacy no activado |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Gating duplicado o drift | Medium | Solo `selected`; no reevaluar reglas/prioridad |
| Historial incompleto | Medium | Garantias limitadas al input; silencio ante datos inseguros |
| Canal confundido con delivery | Medium | Labels cerrados sin imports ni efectos |
| Cambio supera 400 lineas | High | Slices contrato+tests, policy+tests, observer+docs |

## Rollback Plan

Eliminar el subdominio nuevo. Sin consumidor, migracion, storage ni cambios en dependencias activas.

## Dependencies

- Contratos verificados; archive obligatorio: Foundation -> Weather -> Decision -> Orchestrator.

## Success Criteria

- [ ] Mismos inputs/reloj producen exactamente la misma accion o silencio sin mutar inputs.
- [ ] Global disabled, selected null, duplicado, ventana invalida/vencida y frecuencia producen silencios cerrados y testeados.
- [ ] La excepcion `high` respeta 60 minutos, decision distinta y ausencia de otra `high` reciente; no usa scores.
- [ ] Cada `DecisionKind` soportado tiene un unico label de canal; no hay copy, payload de provider, I/O ni persistencia.
