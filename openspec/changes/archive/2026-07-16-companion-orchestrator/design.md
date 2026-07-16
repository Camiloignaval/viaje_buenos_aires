# Design: Companion Orchestrator

## Technical Approach

Crear un subdominio TypeScript puro en `app/src/features/context-engine/companion/`. `orchestrateCompanion` recibe Living Context (frontera tipada, no fuente de nuevas reglas), exclusivamente `decisionRun.selected`, la preferencia global, historial caller-owned y dependencias inyectadas. Devuelve un objeto profundamente congelado `CompanionAction | CompanionSilence`; no lee `evaluations`, ejecuta reglas ni realiza I/O.

## Architecture Decisions

| Decision | Choice / rationale | Rejected |
|---|---|---|
| Autoridad | Sólo `selected`; preserva exactamente identidad, meaning, priority, window, evidence, freshness y payload del Act. | Promover `evaluations` o recalcular decisiones duplica 7.3. |
| Frecuencia | `CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS`: pasa sin historia o con última acción `>=6 h`; dentro de 6 h sólo un Act `high` con dedupe distinto pasa cuando la última acción fue `>=60 min` y ningún `high` ocurrió con edad `<60 min`. | Scores, colas o bypass de duplicado/invalid/window/expiry. |
| Historial | `processedKeys` e historial son snapshots inmutables validados y copiados; `undefined`, `null` o vacío significa sin historia. Cualquier key/entrada incompleta, timestamp inválido/futuro o priority desconocida falla cerrado como `invalid_history`. | Ignorar datos corruptos podría habilitar una intervención insegura. |
| Canal | Labels conceptuales cerrados, nunca autorización de delivery. | Payload Push, rutas o activar sistemas Memory/Editorial prematuramente. |
| Legacy | `app/lib/companionEngine.js` queda intacto; un adapter futuro tendrá paridad antes de activarse. | Mezclar sus reglas/copy JS con el core TS. |

## Data Flow y orden estable

```text
LivingTravelContext (no inspeccionado) ─┐
ContextDecisionRun.selected ────────────┼→ validate/gates → policy → frozen Action|Silence
global preference + history + now() ────┘                         └→ observer seguro
```

El reloj se captura una vez. Gates: (1) preference; (2) selection; (3) decision contract, reloj, kind y window parseables, `validUntil>validFrom`, `expiresAt>validFrom`, `effectiveAt∈[validFrom,validUntil]`; (4) temporal: `now<validFrom` → `not_yet_valid`, `now>=validUntil || now>=expiresAt` → `decision_expired`; (5) history; (6) dedupe; (7) frequency; (8) channel. `validFrom` es inclusivo; ambos finales son exclusivos. El primer fallo fija reason y `evaluatedGates` contiene, en ese orden, sólo gates alcanzados, incluido el fallido. Invalidez, vigencia y duplicado nunca llegan al bypass.

## Interfaces / Contracts

```ts
type CompanionChannel = "push" | "in_app" | "timeline" | "memory" | "editorial";
type CompanionSilenceReason =
  | "preference_disabled" | "no_selected_decision" | "invalid_selected_decision"
  | "not_yet_valid" | "decision_expired" | "already_processed"
  | "invalid_history" | "frequency_limited" | "recent_high_action";
type CompanionGate = "preference" | "selection" | "decision_contract"
  | "temporal_window" | "history" | "dedupe" | "frequency" | "channel";

interface CompanionHistoryEntry {
  readonly dedupeKey: string;
  readonly priority: DecisionPriority;
  readonly processedAt: string;
}
interface CompanionInput {
  readonly context: LivingTravelContext;
  readonly decisionRun: ContextDecisionRun;
  readonly preferences: Readonly<{ enabled: boolean }>;
  readonly processedKeys?: ReadonlySet<string> | null;
  readonly history?: readonly CompanionHistoryEntry[] | null;
}
interface CompanionDecisionRef {
  readonly id: ActDecision["id"];
  readonly kind: DecisionKind;
  readonly priority: DecisionPriority;
  readonly dedupeKey: string;
}
interface CompanionAction {
  readonly outcome: "action";
  readonly actionId: ActDecision["id"]; // identidad existente, sin evento nuevo
  readonly decision: ActDecision;       // clon profundo congelado
  readonly channel: CompanionChannel;
  readonly policy: "CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS";
  readonly reason: "actionable";
  readonly decisionRef: CompanionDecisionRef;
  readonly evaluatedGates: readonly CompanionGate[];
}
interface CompanionSilence {
  readonly outcome: "silence";
  readonly reason: CompanionSilenceReason;
  readonly decisionRef: CompanionDecisionRef | null;
  readonly evaluatedGates: readonly CompanionGate[];
  readonly nextUsefulAt?: string;
  readonly policy: "CONSERVATIVE_INTERVAL_WITH_DISTINCT_HIGH_BYPASS";
}
interface CompanionDependencies {
  readonly now: () => Date;
  readonly observer?: CompanionObserver;
  readonly timingNow?: () => number;
}
```

Mapping auditable: `trip_start_tomorrow → timeline` (anticipación), `trip_start_today → in_app` (momento activo), `trip_last_day → memory` (hito del viaje), `weather_attention_candidate → push` (atención oportuna), `light_moment_candidate → editorial` (material estructurado para tratamiento futuro). Son labels no-delivery: no activan Timeline, Memory, Editorial, Push, render ni copy.

`nextUsefulAt` sólo existe cuando es exacto: `validFrom` para `not_yet_valid`; para normal/low limitado, última acción +6 h; para high, el mínimo entre base y `max(última+60m, últimaHigh+60m si existe)`. Otras razones lo omiten. `CompanionObservation` contiene sólo `outcome`, reason, priority/channel o `none`, policy y `durationMs` finito limitado a 60 s. Observer fallible es best-effort; nunca recibe referencias, gates, dedupe, payload, evidence, historial ni timestamps.

## File Changes

| File | Action | Purpose |
|---|---|---|
| `app/src/features/context-engine/companion/{contracts,policy,observer,orchestrator,index}.ts` | Create | Core y export público puros |
| `app/src/features/context-engine/companion/{policy,orchestrator,observer,boundaries}.test.ts` | Create | Conducta y dependencias negativas |

## Testing Strategy

Unit tests cubren cada gate/reason y precedencia, límites inclusivo/exclusivos, `nextUsefulAt`, 60 min/6 h, high distinto/reciente, cinco mappings, clone/freeze, determinismo, observer seguro e historial/procesadas vacíos, corruptos, futuros o incompletos. Tests negativos usan getters que lanzan para demostrar que ni `context` ni `evaluations` se leen y verifican ausencia de imports hacia providers, Push, delivery, storage, React y legacy.

## Rollout / State

Sin migración, config, consumidor ni feature flag. Entregar en work units rollback-safe: contratos+tests; policy/orchestrator+tests; observer/boundaries. Archive: Foundation → Weather → Decision Engine → Companion Orchestrator. No avanzar a 7.5.

## Open Questions

None.
