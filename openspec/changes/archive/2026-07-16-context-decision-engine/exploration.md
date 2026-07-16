# Exploration: Context Decision Engine

## Qué revisar primero

La Etapa 7.3 debe agregar una **capa de decisión pura** entre `LivingTravelContext` y consumidores futuros. No debe activar Companion, Web Push, UI, IA ni persistencia. La salida recomendada no es una lista de mensajes: es **una decisión seleccionada como máximo más la traza completa y ordenada de todas las reglas**, incluidas sus abstenciones. Así el motor limita la saturación sin esconder por qué una regla actuó, se abstuvo o quedó como candidata no seleccionada.

## Current State

### 1. Living Context ya es la frontera correcta

- `app/src/features/context-engine/livingContext.ts` expone el único boundary compuesto, `createLivingContextResolution`, con `{ initial, settled }`. Destination, Temporal, Financial, Narrative y Weather ya tienen `status`, `reason`, `freshness` y provenance; una falla async se aísla mediante `Promise.allSettled`.
- `LivingTravelContext` no contiene `tripId`, preferencias de acompañamiento ni historial de deduplicación. El motor debe recibirlos como input explícito junto con el snapshot, sin ampliar Living Context con ownership que no le corresponde.
- `capabilities.weather` solo significa `weather.status === "available"`; **no garantiza** que el dato sea fresh, coherente o accionable. Una regla Weather debe comprobar capability, status, freshness, value, `expiresAt`, timezone/fecha efectiva y consistencia de condición/booleanos.
- Temporal reutiliza `safeTripTemporalState`. Su `freshness` puede ser `stale` porque provenance se calcula desde `Trip.updatedAt`, aunque el estado calendario acaba de derivarse con el reloj inyectado. Las reglas temporales pueden aceptar explícitamente un resultado `available` stale **solo** porque vuelven a validar fechas/timezone y el estado fue derivado para ese `now`; esta excepción no se extiende a Weather.
- Un viaje de un solo día devuelve `state.kind === "today"`, no `in-progress`. Para conservar la precedencia actual, `trip-start-today` actúa y `last-day` se abstiene; no se debe inventar un segundo estado ni duplicar la primitiva temporal.
- No hace falta React, TanStack Query, backend, endpoint, provider ni storage para evaluar decisiones. El subdominio natural es TypeScript puro bajo `app/src/features/context-engine/decision/`, consumiendo únicamente contratos normalizados.

### 2. Companion ya decide, pero mezcla responsabilidades

`app/lib/companionEngine.js` evalúa, en este orden implícito de primer match: `before-trip`, `start`, `last-day`, `returned`, `week-after`. Cada tupla mezcla fecha, preferencia, tipo, body; luego también construye `path`, `key` y fecha de entrega. `selectCompanionEvents` filtra por `sentKeys`.

Ese comportamiento demuestra cinco decisiones de lifecycle, pero hoy mezcla:

- regla temporal y prioridad implícita por posición;
- consentimiento (`enabled`) y preferencias por etapa;
- copy editorial final;
- navegación/canal (`path`);
- dedupe (`key`, `sentKeys`).

La frontera Node JS no es directamente compartida con el TypeScript de `src`: `tsconfig.json` incluye `src` y Vitest, mientras los tests Node ejecutan `lib/**/*.test.js`. Forzar ahora una migración o import cruzado aumentaría riesgo y podría alterar copy, prioridad o scheduling. Companion debe permanecer intacto. Un adapter futuro podrá mapear decisiones temporales del nuevo motor a los eventos existentes y demostrar paridad antes de eliminar duplicación.

Las reglas `returned` y `week-after` **no entran** en 7.3. Las reglas de mañana/hoy/último día pueden expresarse en el nuevo contrato, pero no se conectan ni sustituyen a Companion todavía.

### 3. Consentimiento, PWA y deduplicación reales

- El contrato existente de preferencias es `enabled`, `beforeTrip`, `duringTrip`, `afterTrip`, `futureMemories`. `DEFAULT_PUSH_PREFERENCES.enabled` y el estado inicial React son `false`; las demás opciones no sustituyen ese consentimiento global.
- `eligible` y capacidades de instalación/notificaciones en `PushCompanion.tsx` son gates de UI/dispositivo. No pertenecen al motor puro y no deben decidir si existe una situación contextual.
- El input propuesto debe ser estructural y desacoplado de PWA: consentimiento ausente o `enabled !== true` produce abstención; `beforeTrip` controla mañana y `duringTrip` controla hoy, último día, Weather y Light. `afterTrip`/`futureMemories` se conservan para un adapter futuro, pero no habilitan reglas en esta etapa.
- `pushEvents` solo registra pruebas de Web Push; no existe un store apropiado de eventos de decisión procesados. Esta etapa debe aceptar un `ReadonlySet<string>` inyectado, consultarlo sin mutarlo y no persistir nada.

### 4. Story Intelligence no alcanza hoy para Weather o Light

Los campos reales son `outdoor`, `indoor`, `rainFriendly`, `photoMoment` y `bestMoment`. No existen `rainSensitive` ni `weatherSensitive`. Además, `Activity.timeWindow` y `StoryIntelligence.bestMoment` son texto libre, no ventanas de máquina.

El Story real `story-ba2026.json` tiene 28 actividades y **0 actividades con `intelligence`**; sus 28 `timeWindow` son texto libre y los capítulos no declaran fecha. Los cinco lugares con intelligence solo declaran `reservationRecommended`. Por lo tanto, Weather y Light deben abstenerse con los datos productivos actuales. Tests/fixtures pueden probar el contrato futuro, pero el motor no debe inferir sensibilidad a lluvia por ausencia de `rainFriendly`, parsear lenguaje natural ni inventar una fecha de actividad.

La frontera mínima propuesta agrega al input una lista opcional de candidatos normalizados, no el Story completo: `activityId`, metadata exacta de Story Intelligence y una ventana destino-local estructurada (`validFrom`, `validUntil`, timezone). Un adapter futuro podrá producirla cuando exista metadata curada suficiente. Para Weather, la señal conservadora es `outdoor === true && rainFriendly === false`; `indoor === true`, `rainFriendly === true`, metadata ausente o contradicción `indoor && outdoor` exigen abstención. Para Light se exige `photoMoment === true` y una ventana estructurada relacionada con sunrise/sunset; `bestMoment` libre puede quedar como evidencia curada, pero no autoriza por sí solo una decisión.

### 5. Contrato y evaluación recomendados

Contrato conceptual pequeño y discriminado:

```ts
interface ContextDecisionRun {
  selected: ActDecision | null;
  evaluations: readonly RuleEvaluation[];
}

type RuleOutcome = ActDecision | AbstainDecision;
```

Un `ActDecision` debe contener solo semántica de decisión: `id`/`kind`, categoría, prioridad cerrada, evidencia categórica mínima, capabilities y módulos usados, vigencia destino-local, `expiresAt`, `dedupeKey`, reason code y payload estructurado sin copy. Un `AbstainDecision` conserva `ruleId`, reason code cerrado, capabilities faltantes, módulos stale/unavailable, conflictos y `nextUsefulEvaluationAt` solo cuando pueda calcularse con certeza. La traza preserva orden y outcome de cada regla; no registra payload completo en observabilidad.

El motor devuelve **una sola `selected`**, no una lista pública de acciones. Las demás candidatas válidas permanecen visibles en `evaluations` con su disposición de selección; las abstenciones nunca desaparecen. Resolución:

1. evaluar todas las reglas en orden nominal fijo, sin early return global;
2. convertir keys ya procesadas en `already_processed` sin mutar el set;
3. colapsar equivalentes por `dedupeKey`, favoreciendo mayor prioridad y luego orden de regla;
4. si señales de una misma categoría se contradicen, abstener solo esas candidatas como `conflicting_signals`; una contradicción Weather no bloquea Trip Start;
5. seleccionar la candidata restante de mayor prioridad; empates se resuelven por orden fijo;
6. conservar candidatas no seleccionadas en la traza, en vez de obligar a cada consumidor a reimplementar prioridad.

Prioridad cerrada, no numérica: `high` para atención operativa externa y perecedera (Weather), `normal` para lifecycle del día y Light dentro de ventana, `low` para mañana. No existe `critical` en esta etapa.

### 6. Reglas iniciales permitidas

Orden nominal explícito propuesto, independiente de la prioridad:

1. `trip-start-tomorrow` — `beforeTrip`; actúa solo con temporal válido en el destino. Dedupe: `trip-start-tomorrow:{tripId}:{localDate}`.
2. `trip-start-today` — `duringTrip`; actúa con `state.kind === "today"`. Dedupe: `trip-start:{tripId}:{localDate}`.
3. `last-day` — `duringTrip`; actúa solo con `in-progress.isLastDay === true`. Un viaje de un día conserva la selección `trip-start-today`. Dedupe: `last-day:{tripId}:{localDate}`.
4. `weather-attention-candidate` — `duringTrip`; exige Weather available+fresh+no expirado+coherente, actividad normalizada vigente, `outdoor === true`, `rainFriendly === false` y lluvia/tormenta/nieve o precipitación sobre un umbral explícito en specs. Nunca afirma “cambiar el plan”. Dedupe: `weather-attention:{tripId}:{activityId}:{effectiveWindow}`.
5. `light-moment-candidate` — `duringTrip`; exige sunrise/sunset fresh y coherente, actividad vigente, `photoMoment === true` y ventana estructurada relacionada. No recomienda ni genera copy. Dedupe: `light-moment:{tripId}:{activityId}:{effectiveWindow}`.

Todas las ventanas usan timezone del destino. Trip Start/Last Day vencen al final del día local; Weather/Light usan la intersección entre ventana de actividad, vigencia del snapshot y fenómeno relevante. No se usa timezone de server/browser y una decisión expirada no puede seleccionarse.

### 7. Abstención como resultado de primera clase

El catálogo inicial debe cubrir, al menos:

- `incomplete_context` — falta trip id, temporal o estructura mínima;
- `missing_capability` — capability requerida ausente;
- `module_unavailable` / `weather_unavailable` — módulo requerido no resolvió;
- `module_stale` / `weather_stale` — Weather stale o expirado;
- `missing_activity_metadata` — sin intelligence o ventana estructurada;
- `weak_signal` — precipitación/condición o relación con luz insuficiente;
- `outside_effective_window` — actividad, viaje o snapshot fuera de vigencia;
- `preference_disabled` — consentimiento global o preferencia de etapa apagada;
- `already_processed` — `dedupeKey` presente en el set inyectado;
- `trip_finished` / `trip_not_applicable` — lifecycle incompatible con la regla;
- `conflicting_signals` — metadata o Weather contradictorios;
- `invalid_context` — timezone, fechas, ventanas o valores incoherentes;
- `duplicate_candidate` — otra regla ya produjo la misma identidad semántica.

Weather debe abstenerse si `condition` contradice `isRaining`/`isStorm`/`isSnow`; no debe “corregir” el provider normalizado. Financial no participa en estas reglas: su falla no afecta decisiones Weather/Temporal y una falla Weather no afecta reglas temporales.

### 8. Decisiones no permitidas

Quedan fuera: cambio/reordenamiento automático de itinerario; ranking de actividades; restaurantes, reservas, transporte, aeropuerto, ubicación/geofencing, seguridad, fotos como recordatorio, eventos/feriados, vestimenta generada, nuevas notificaciones, canales definitivos, IA/LLM, copy, scores emocionales opacos, Memory Engine, persistencia de decisiones o snapshots, endpoints/Vercel Functions, configuración nueva, UI/Experience y cualquier regla `returned`/`week-after`.

### 9. Explainability, observabilidad y Health Check

- Cada evaluación debe conservar regla, evidencia mínima, módulos/capabilities consultados, freshness aceptada, vigencia, outcome y reason code. Evidencia no significa snapshot completo: solo campos necesarios y categóricos.
- Observer inyectado y best-effort: `ruleId`, `evaluated|act|abstain`, reason code, disponibilidad/freshness categórica y duración sanitizada. Nunca coordenadas, correo, notas, presupuesto, ids de usuario/actividad/viaje, dedupe keys, contenido privado, copy, payload, tokens o errores crudos.
- `runHealthCheck` ya ofrece `extraCheckers` puro y legacy-safe. Si se extiende, debe recibir un manifiesto sanitizado opcional y validar ids duplicados, capabilities/reason codes desconocidos, ventanas inválidas, ausencia de dedupe strategy y expiración requerida. Sin manifiesto no genera findings; Weather ausente/no configurado nunca es critical; no llama providers ni muta Stories.
- El orden de archive OpenSpec debe ser: `living-context-foundation` → `living-context-weather` → `context-decision-engine`.

## Affected Areas

- `app/src/features/context-engine/decision/` — nuevo subdominio TS puro: contratos, reglas nombradas, evaluación, prioridad/dedupe y observer seguro.
- `app/src/features/context-engine/livingContext.ts` y `types.ts` — contratos consumidos; no agregar React/backend ni red al resolver.
- `app/src/features/trips/lib/countdown.ts` — primitiva temporal a reutilizar sin cambiar sus semánticas.
- `app/src/features/story/engine/intelligence.ts` y `types.ts` — metadata real; un adapter futuro deberá normalizar ventanas sin heurísticas.
- `app/src/features/story/health/{healthCheck,types}.ts` — seam opcional para validar el manifiesto de reglas de forma local y legacy-safe.
- `app/lib/companionEngine.js` — frontera de compatibilidad documentada; debe permanecer funcionalmente intacta.
- `app/lib/platformPush.js` y `app/src/features/pwa/` — fuentes actuales de preferencias/entrega; no deben importarse desde el motor ni cambiar en 7.3.
- Tests junto al subdominio/Health Check — evidenciar determinismo, inmovilidad, DST/timezone, abstenciones, conflictos, aislamiento de módulos y fixtures Weather/Light futuros.

## Approaches

1. **Subdominio TS puro con reglas explícitas y una selección + traza completa** — engine bajo `context-engine/decision`, input explícito, reglas nombradas/ordenadas y observer inyectado.
   - Pros: determinista, auditable, no satura, preserva abstenciones, reutiliza Living Context y permite adapter futuro a Companion.
   - Cons: requiere definir ahora reason codes, prioridad y contrato normalizado de actividad; los datos productivos actuales abstendrán Weather/Light.
   - Effort: Medium

2. **Lista ordenada de acciones para que cada consumidor elija** — el engine retorna todas las acciones válidas y abstenciones por separado.
   - Pros: máxima flexibilidad para consumidores futuros y coexistencia visible.
   - Cons: traslada conflicto/prioridad/saturación a Companion, Editorial y Memory; distintos consumidores podrían decidir distinto con el mismo contexto.
   - Effort: Medium

3. **Migrar o compartir ahora el Companion JS** — extraer sus reglas y hacer que Node/TS consuman una implementación común.
   - Pros: elimina antes la duplicación temporal potencial.
   - Cons: cruza suites/builds, mezcla copy/entrega con decisión y arriesga cambiar comportamiento ya publicado; no resuelve Weather/Light ni explainability.
   - Effort: High

4. **Registry/framework dinámico de reglas** — reglas registradas por metadata/plugins.
   - Pros: extensibilidad aparente.
   - Cons: abstracción anticipada, orden/conflictos menos visibles, mayor superficie de validación y ninguna necesidad real con cinco reglas.
   - Effort: High

## Recommendation

Adoptar el enfoque 1. Diseñar antes de codificar un engine puro con reglas explícitas y ordenadas, `Act | Abstain`, una sola decisión seleccionada y una traza completa. El input agrega `tripId`, preferencias, `ReadonlySet` procesado y candidatos de actividad normalizados; Living Context permanece como autoridad contextual. Temporal acepta explícitamente su estado recién derivado aunque provenance sea stale; Weather exige fresh, no expirado y coherente. El Story real obliga a Weather/Light a guardar silencio y fixtures prueban la evolución futura sin inventar metadata.

Dividir la implementación futura en work units rollback-safe: contratos/evaluator; reglas temporales; reglas Weather/Light con fixtures; Health Check/compatibilidad. El cambio probablemente supera el presupuesto de 400 líneas principalmente por tests, por lo que `sdd-tasks` debe recomendar slices revisables y mantener cada comportamiento con su prueba.

## Risks

- Confundir `capabilities.weather` con freshness produciría decisiones operativas basadas en datos vencidos.
- Parsear `timeWindow`/`bestMoment` libre o asumir que falta de `rainFriendly` significa sensibilidad inventaría evidencia.
- Cambiar la semántica single-day de `safeTripTemporalState` rompería paridad futura con Companion.
- Un reason-code catalog demasiado grande puede convertirse en framework; specs deben cerrar el mínimo y distinguir abstención de disposición de selección.
- Un adapter futuro a Companion debe mantener su prioridad, copy, path y key hasta demostrar paridad; 7.3 no elimina duplicación aún.
- Open-Meteo sigue sujeto a restricciones comerciales/atribución y gate de configuración antes de rollout; el engine no debe ampliar su uso ni depender del provider.
- Foundation y Weather siguen activos sin archive; archivarlos fuera de orden rompería la trazabilidad SDD.

## Ready for Proposal

**Yes.** El repositorio ya ofrece contexto normalizado y primitiva temporal suficientes. La propuesta debe congelar el contrato selección+traza, catálogo de reglas/reasons/prioridades, aceptación especial de freshness temporal, gates estrictos Weather, metadata de actividad normalizada y frontera futura con Companion/Editorial/Memory, preservando silencio con los datos reales actuales.
