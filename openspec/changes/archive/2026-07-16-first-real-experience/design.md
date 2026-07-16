# Design: First Real Experience

## Enfoque técnico

`app/src/features/experience/firstRealExperience.ts` será un **compositor puro de aplicación**, no un motor ni una capa nueva. Importará únicamente APIs públicas: `createLivingContextResolution`, `createContextDecisionRun`, `orchestrateCompanion`, `createEditorialMessage` y `classifyMemory`. Un único ISO instantáneo se valida y cierra sobre los tres `now`; se espera `settled` y cada salida se entrega literalmente al siguiente contrato.

## Decisiones de arquitectura

| Opción | Tradeoff | Decisión y razón |
|---|---|---|
| Imports directos vs. inyectar motores | DI facilitaría mocks, pero permitiría sustituir autoridades | Imports directos; el E2E debe probar implementaciones reales y las fronteras permiten dependencia downstream desde `experience/`. Sólo el observer es inyectable. |
| Lanzar errores vs. resultado terminal | Lanzar preserva detalle privado | Resultado `error` categórico y fail-closed; no continúa ni crea intents. |
| Intent único vs. intent por artefacto | Varios intents confundirían composición con ejecución futura | Sólo el éxito con `MemoryCandidate` crea un intent `pending` hacia el canal Companion permitido, con referencias categóricas al mensaje y candidato. Todo terminal crea cero intents. |
| Persistir Memory vs. detenerse | Persistir requiere request, auth y Mongo | Detenerse exactamente en `MemoryCandidate`; nunca llamar lifecycle/repository. |

## Flujo y terminales

```text
Living settled -> Decision selected -> Companion
       | abstain -> terminal decision_abstain (0 intents)
                                      | silence -> terminal silence
                                      v action
EditorialMessage -> MemoryClassification
                    | discard -> terminal memory_discard (0 intents)
                    v candidate -> terminal composed + 1 intent
Any invalid/throw -> terminal error (0 intents); no pasos posteriores
```

El observer recibe cada evento congelado best-effort; sus excepciones se ignoran y no cambian el resultado. El trace acumulado también queda profundamente congelado.

## Contratos

```ts
type FirstRealExperienceInput = Readonly<{
  logicalInstant: string; livingContext: LivingContextInput;
  decision: Omit<DecisionInput, "context">;
  companion: Omit<CompanionInput, "context" | "decisionRun">;
  memory: Readonly<{ scope: MemoryScope; facts: MemoryClassificationFacts }>;
}>;

type DeliveryIntent = Readonly<{
  destination: "push" | "in_app" | "timeline" | "memory";
  state: "pending";
  references: readonly ["editorial_message", "memory_candidate"];
}>;

type ExperienceStage = "living_context" | "decision_engine" | "companion" |
  "editorial_voice" | "memory_engine";
type ExperienceTraceEvent = Readonly<{
  stage: ExperienceStage;
  outcome: "resolved" | "selected" | "abstained" | "action" | "rendered" |
    "candidate" | "silence" | "discard" | "error";
  reason: "none" | "trip_started" | DecisionReason | CompanionSilenceReason |
    DiscardReason | FirstRealExperienceErrorCode;
}>;

type FirstRealExperienceErrorCode = "invalid_input" | "unsettled_context" |
  "dependency_error" | "lineage_error" | "unsupported_destination";
```

`FirstRealExperienceResult` es unión discriminada e inmutable: `composed` contiene decision run, action, message, candidate, exactamente un intent y trace; `decision_abstain` conserva la decisión; `companion_silence` conserva `CompanionSilence`; `memory_discard` conserva `MemoryDiscard`; `error` contiene `stage` y `FirstRealExperienceErrorCode`. Los cuatro terminales contienen `deliveryIntents: readonly []`, finalizan el trace en la capa causal y no exponen errores crudos. `FirstRealExperienceDependencies` sólo admite `observer(event)`.

## Fixture y archivos

| Archivo | Acción |
|---|---|
| `app/src/features/experience/firstRealExperience.ts` | Crear compositor y contratos. |
| `app/src/features/experience/firstRealExperience.test.ts` | Crear E2E puro y fronteras. |
| `app/src/features/dev/firstRealExperienceSimulator.ts` | Crear fixture/simulador sin entrypoint. |
| `app/src/features/dev/firstRealExperienceSimulator.test.ts` | Crear snapshot determinista y aislamiento. |

El fixture usa `2026-10-03T15:00:00.000Z`, viaje `trip-1`, `2026-10-03..06`, `America/Argentina/Buenos_Aires`, owner `user-1`, story `story-1`, preferencias habilitadas y sets/history/activities vacíos. Exporta `simulateFirstRealExperience()` y un snapshot de transiciones; ningún archivo productivo lo importa.

## Estrategia de pruebas Strict TDD

Primero RED: (1) E2E real verifica `trip_start_today -> in_app -> Editorial -> trip_started` y un único intent; (2) abstención corta Companion/Editorial/Memory; (3) silencio y descarte producen cero intents y cortan downstream; (4) contexto no settled, input inválido, lineage/error de dependencia y destino no permitido fallan cerrados con cero intents; (5) observer hostil no altera resultados ni filtra IDs, texto, fechas, payloads o errores; (6) inmutabilidad y snapshot del simulador; (7) escaneo estático prohíbe I/O, UI, providers, AI, Story y lifecycle/repository. Una prueba ejecuta `git diff --exit-code <planning-base> --` sobre Living Context, Decision, Companion, Editorial y Memory: prueba byte/rango que los cinco motores permanecen intactos. Sin mocks de motores, build ni Playwright.

## Rollout y riesgo

Sin migración, flag, ruta ni consumidor. El cambio puede superar 400 líneas por contratos y evidencia: dividir en work units compositor/E2E y simulador/fronteras. Rollback: eliminar los cuatro archivos nuevos.

## Preguntas abiertas

Ninguna.
