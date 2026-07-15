# Design: Context Decision Engine

## Enfoque técnico

Crear un subdominio TypeScript puro en `context-engine/decision/`. Recibe `LivingTravelContext` resuelto e inputs inmutables; no importa React, PWA, backend, provider ni Story. Cinco reglas explícitas se evalúan en orden estable y el motor devuelve una acción seleccionada como máximo, más la traza ordenada completa. El silencio queda representado por abstenciones, no por inferencias del consumidor.

## Decisiones de arquitectura

| Opción | Tradeoff | Decisión y motivo |
|---|---|---|
| Array fijo vs registry | Menos extensibilidad accidental | `DECISION_RULES` contiene `trip-start-tomorrow`, `trip-start-today`, `last-day`, `weather-attention-candidate`, `light-moment-candidate`; orden y auditoría quedan visibles. |
| Una selección vs lista pública | Menos libertad por consumidor | `selected: ActDecision \| null` evita saturación; `evaluations` conserva cada Act/Abstain y disposición, sin ocultar evidencia. |
| Prioridad cerrada vs score | Menor granularidad | `high > normal > low`; Weather es `high`, hoy/último día/Light `normal`, mañana `low`. El orden fijo desempata. |
| Story crudo vs candidatos normalizados | Requiere adapter futuro | Solo candidatos curados; nunca se parsean `timeWindow`, `bestMoment` ni otro texto libre. Con la Story actual Weather/Light se abstienen. |
| Compartir Companion ahora vs seam futuro | Duplicación temporal transitoria | `app/lib/companionEngine.js` permanece intacto. Un adapter futuro demostrará paridad JS/TS antes de activar decisiones. |

## Contratos

```ts
type RuleId = "trip-start-tomorrow" | "trip-start-today" | "last-day" |
  "weather-attention-candidate" | "light-moment-candidate";
type DecisionPriority = "high" | "normal" | "low";
type DecisionCategory = "trip_lifecycle" | "weather_attention" | "light_moment";
type DecisionConfidence = "sufficient" | "insufficient" | "unknown";
type DecisionReason = "actionable" | "incomplete_context" | "missing_capability" |
  "module_unavailable" | "module_stale" | "missing_activity_metadata" |
  "weak_signal" | "outside_effective_window" | "preference_disabled" |
  "already_processed" | "trip_finished" | "trip_not_applicable" |
  "conflicting_signals" | "invalid_context" | "duplicate_candidate" |
  "not_selected";

interface DecisionInput {
  readonly tripId: string;
  readonly context: LivingTravelContext;
  readonly preferences: Readonly<{ enabled: boolean; beforeTrip: boolean; duringTrip: boolean }>;
  readonly processedKeys: ReadonlySet<string>;
  readonly activities: readonly NormalizedActivityCandidate[];
}
interface NormalizedActivityCandidate {
  readonly activityId: string;
  readonly intelligence: Readonly<Pick<StoryIntelligence,
    "outdoor" | "indoor" | "rainFriendly" | "photoMoment">>;
  readonly window: Readonly<{ validFrom: string; validUntil: string; timezone: string }>;
}
interface DecisionRule {
  readonly id: RuleId;
  readonly purpose: string;
  readonly enables: readonly string[];
  readonly requiredCapabilities: readonly (keyof LivingContextCapabilities)[];
  readonly requiredModules: readonly LivingContextModuleName[];
  readonly priority: DecisionPriority;
  readonly freshnessPolicy: "derived_temporal" | "fresh_weather";
  readonly abstainReasons: readonly DecisionReason[];
  evaluate(input: DecisionInput, now: Date): readonly RuleEvaluation[];
}
interface DecisionDependencies {
  readonly now: () => Date;
  readonly rules?: readonly DecisionRule[]; // default: DECISION_RULES
  readonly observer?: DecisionObserver;
}
type ContextDecision = ActDecision | AbstainDecision;
interface ContextDecisionRun { readonly selected: ActDecision | null; readonly evaluations: readonly RuleEvaluation[] }
```

`ActDecision`/`AbstainDecision` se discriminan por `outcome`. Act contiene `id = decision:${dedupeKey}`, kind, categoría, prioridad, reason, evidencia categórica mínima, capabilities/módulos, ventana, expiración, dedupe key y payload sin copy. Abstain contiene rule/reason, faltantes/stale/conflictos y `nextUsefulEvaluationAt` solo si es exacto. `RuleEvaluation` agrega disposición `selected | not_selected | abstained`, confidence cerrada, freshness y vigencia (`validFrom`, `validUntil`, `effectiveAt`). Módulo/capability reutilizan `LivingContextModuleName` y `keyof LivingContextCapabilities`.

## Flujo y semántica

```text
input + now() -> reglas ordenadas -> evaluaciones completas
  -> processedKeys -> conflictos por categoría -> dedupeKey
  -> prioridad/orden -> selected | null -> observer seguro
```

Inputs no se mutan; candidatos se ordenan por ventana e `activityId`. Ventanas/IDs usan fecha local destino; el reloj y el array explícito son inyectables. Trip Start/Last Day vencen al fin del día local. En viaje de un día actúan inicio y Last Day, y gana inicio por orden estable. Temporal `available` acepta provenance stale porque `state` fue derivado para ese `now`, tras revalidar fechas/timezone. Weather exige capability, `available`, `fresh`, `now < expiresAt`, timezone/fecha efectivos coherentes y flags compatibles con condition. Weather actúa solo con `outdoor === true`, `rainFriendly === false` y lluvia/tormenta/nieve o el umbral nombrado `WEATHER_ATTENTION_PRECIPITATION_PERCENT`; Light exige `photoMoment === true` e intersección estructurada con sunrise/sunset fresh. Financial no participa.

El observer best-effort recibe solo ruleId, fase, reason, availability/freshness categóricas y duración sanitizada; nunca ids de viaje/actividad, keys, payload, PII ni errores crudos. Editorial/Memory futuros consumen kind, ventana, reason y payload mínimo, sin copy ni persistencia.

## Archivos

| Archivo | Acción |
|---|---|
| `app/src/features/context-engine/decision/{contracts,constants,time,rules,engine,observer,index}.ts` | Crear contratos, tiempo local, cinco reglas y selección. |
| `app/src/features/context-engine/decision/{engine,temporalRules,weatherLightRules}.test.ts` | Crear pruebas puras. |
| `app/src/features/story/health/decisionManifestCheck.ts` y test | Crear checker local del manifiesto sanitizado. |
| `app/src/features/story/health/{types,healthCheck}.ts` | Agregar contexto/checker opcional; sin manifiesto retorna `[]`. |

## Pruebas y ciclo SDD

Vitest cubrirá determinismo/inmutabilidad, reloj, orden, selección, abstenciones, conflictos, dedupe, expiración, timezone/DST, mañana/hoy/último día/single-day, aislamiento Financial/Weather, Weather fresh/stale/incoherente y Light/metadata/ventanas. Health cubrirá ids duplicados, tipos desconocidos, metadata/ventanas/dedupe/expiry inválidos y legacy sin findings. No aplica E2E: no hay UI.

No hay migraciones, flags, configuración, endpoints ni rollout activo. `state.yaml` es del orquestador: registra design completo, luego tasks/apply/verify; no lo modifica este subdominio. Archive autorizado: Foundation → Weather → Decision Engine. Open-Meteo no se importa ni expande; restricciones comerciales/atribución siguen bloqueando rollout productivo.

## Preguntas abiertas

Ninguna bloqueante.
