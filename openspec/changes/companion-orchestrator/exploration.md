## Exploration: Companion Orchestrator

### Current State

#### Fuente de verdad verificada

`app/src/features/context-engine/decision/contracts.ts` expone un `ContextDecisionRun` inmutable con `decision`, `selected: ActDecision | null` y `evaluations`. `ActDecision` ya contiene identidad semántica (`id`, `dedupeKey`), `priority`, `category`, `kind`, evidencia categórica, freshness, módulos/capabilities, payload mínimo sin copy y una ventana completa (`validFrom`, `validUntil`, `effectiveAt`, `expiresAt`). `AbstainDecision` explica silencio con reason codes cerrados, faltantes, stale, conflictos y próxima evaluación útil cuando es exacta.

`app/src/features/context-engine/decision/engine.ts` ya aplica preferencias por regla, capabilities, módulos disponibles, ventana/expiración, `processedKeys`, deduplicación, conflicto por categoría, prioridad `high > normal > low` y orden estable. Produce como máximo un `selected`; las demás evaluaciones son traza explicable. El observer es best-effort, categórico y no altera la decisión. La verificación activa de `context-decision-engine` demuestra 65/65 escenarios y deja explícito que no existe consumidor productivo.

Consecuencia: el Orchestrator NO debe recorrer `evaluations` para promover un Act `not_selected`, recalcular prioridad, reinterpretar evidencia ni consultar Living Context para decidir de nuevo. La única entrada accionable de un run es `run.selected`.

#### Companion legacy y frontera JS/TS

`app/lib/companionEngine.js` es un motor Node JS independiente. Calcula por fecha local cinco eventos (`before-trip`, `start`, `last-day`, `returned`, `week-after`), mezcla selección con copy (`body`) y navegación (`path`), y deduplica contra un `sentKeys` inyectado. La prioridad es implícita por orden del array; `find()` deja una sola coincidencia por viaje. Sus tests cubren fecha/preferencia y sent key.

No hay adapter entre ese motor y el Decision Engine TS. Importarlo o convertir sus eventos en decisiones reintroduciría reglas de negocio, copy y rutas dentro de 7.4, además de exigir paridad cross-runtime. Debe permanecer intacto; un adapter futuro se documenta y prueba antes de activarse.

#### Preferencias y gates existentes

`app/lib/platformPush.js` define defaults persistidos: `enabled: false`, `beforeTrip: true`, `duringTrip: true`, `afterTrip: true`, `futureMemories: false`; `normalizePushPreferences` nunca reactiva consentimiento por ausencia. `app/src/features/pwa/pushApi.ts` replica ese contrato en TS. `PushCompanion.tsx` permite activar/desactivar, alternar `futureMemories` y enviar una prueba; además exige capacidades PWA. `PersonalPage.tsx` sólo muestra el control si existe al menos un viaje.

Para 7.4 no se necesitan preferencias nuevas ni cambios UI. El core debe aceptar una vista estrecha e inmutable de las preferencias existentes. Debe volver a aplicar solamente el gate global `enabled`: `false` siempre produce silencio, sin excepción. `beforeTrip`/`duringTrip` ya fueron aplicadas por Decision Engine; repetirlas sería gating duplicado. `afterTrip`/`futureMemories` no corresponden a las decisiones actuales.

#### Push, delivery, eventos e historial

- `app/lib/platformPush.js` administra suscripciones, consentimiento, envío real y una colección `pushEvents` usada hoy sólo para limitar pushes de prueba. No es historial de decisiones Companion.
- `app/lib/notifications/notificationService.js` tiene idempotencia persistida para emails de feedback mediante `notificationDeliveries`; sus tipos, canales y ciclo `processing/sent/failed` pertenecen a delivery, no a orquestación.
- `app/lib/platformMongo.js` ofrece colecciones de Push y deliveries, pero no existe colección de historial del Orchestrator.
- El único historial semántico reutilizable hoy es el `processedKeys`/`sentKeys` inyectado a motores puros; no está persistido por esta etapa.

Consumir esas infraestructuras activaría red, storage, providers o delivery y acoplaría el core TS a backend JS. 7.4 sólo debe recibir historial mínimo como valor inmutable; su persistencia queda para el consumidor futuro.

#### Dependencias OpenSpec

Los cambios activos están verificados y `ready-for-archive`, pero no archivados: `living-context-foundation` → `living-context-weather` → `context-decision-engine`. `companion-orchestrator` depende de esos contratos y debe quedar después de Decision en el orden de archive. No debe modificar ninguno de los tres.

### Affected Areas

- `app/src/features/context-engine/decision/contracts.ts` — contrato verificado que se consume, no se modifica.
- `app/src/features/context-engine/decision/engine.ts` — ya resuelve selección, prioridad, dedupe y ventanas; no se replica.
- `app/src/features/context-engine/decision/observer.ts` — patrón de observabilidad segura a reutilizar conceptualmente.
- `app/lib/companionEngine.js` — comportamiento legacy que debe permanecer sin cambios; futuro adapter, no activación.
- `app/lib/platformPush.js` y `app/src/features/pwa/{pushApi.ts,PushCompanion.tsx}` — fuente de preferencias existentes y frontera explícita con delivery/UI.
- `app/lib/notifications/notificationService.js` — idempotencia de delivery no reutilizable dentro del core puro.
- `openspec/changes/{living-context-foundation,living-context-weather,context-decision-engine}/` — dependencias activas y orden obligatorio.
- Propuesto: `app/src/features/context-engine/companion/` — pequeño subdominio TS puro de contratos, política, observer y tests; no es un segundo Companion ni otro engine de decisiones.

### Approaches

1. **Gatear únicamente `run.selected`** — recibir el run verificado y decidir acción/silencio mediante preferencias globales, vigencia, historial y cooldown.
   - Pros: respeta la selección del Decision Engine; frontera mínima; evita reglas duplicadas; conserva explainability; fácil de probar sin I/O.
   - Cons: procesa una selección por ejecución; una futura agregación multi-viaje necesitaría un adapter externo explícito.
   - Effort: Low.

2. **Aceptar una lista ordenada de Act existentes** — recibir varios Act ya seleccionados y elegir uno según prioridad/cooldown.
   - Pros: soporta agregación multi-viaje en una sola llamada.
   - Cons: vuelve a seleccionar y ordenar; duplica parte del Decision Engine; aumenta riesgo de starvation y de semántica divergente; el contrato actual no entrega esa lista como salida autorizada.
   - Effort: Medium.

3. **Adaptar eventos del Companion legacy** — transformar `before-trip/start/...` en acciones del Orchestrator.
   - Pros: reutiliza comportamiento productivo y sus `sentKeys`.
   - Cons: arrastra copy/path, reglas y prioridades implícitas; mezcla JS Node con TS frontend; no tiene evidencia/freshness/ventanas equivalentes; viola el mandato de consumir decisiones existentes.
   - Effort: High.

### Recommendation

Implementar la opción 1 como una función TS pura y determinista, por ejemplo `orchestrateCompanion(input, dependencies): CompanionAction | CompanionSilence`. Debe vivir junto al Context Engine como consumidor de Decision, no como un nuevo motor paralelo. Living Context puede viajar en el input normalizado exigido por la etapa, pero el core no debe inspeccionarlo para recrear elegibilidad: `run.selected` es la autoridad de decisión.

Conceptos probables:

```ts
interface CompanionOrchestrationInput {
  readonly context: LivingTravelContext;
  readonly decisionRun: ContextDecisionRun;
  readonly preferences: Readonly<{ enabled: boolean }>;
  readonly history: readonly CompanionHistoryEntry[];
}

interface CompanionHistoryEntry {
  readonly dedupeKey: string;
  readonly processedAt: string;
}

type CompanionChannel = "push" | "in_app" | "timeline";
type CompanionOutput = CompanionAction | CompanionSilence;
```

`CompanionAction` debe referenciar la decisión existente y conservar kind/category/priority, dedupe, ventana, payload estructurado y una clasificación conceptual de canal; nunca texto final ni payload Push. La clasificación debe ser un mapa cerrado y auditable por `DecisionKind`, no inferencia dinámica. `memory` y `editorial` no deben activarse como sistemas; si se incluyen como labels futuros, son sólo valores cerrados sin imports ni efectos.

`CompanionSilence` debe tener reasons cerradas y explicables, al menos: `preference_disabled`, `no_selected_decision`, `already_processed`, `outside_effective_window`, `expired` y `cooldown_active`. Debe conservar sólo referencias/evidencia mínima necesaria, sin PII ni errores crudos.

Política congelada para proposal/spec:

1. `preferences.enabled === false` siempre gana y produce silencio, sin bypass por prioridad.
2. `run.selected === null` produce silencio; nunca se promueve otra evaluación.
3. El `dedupeKey` de Decision se reutiliza sin regenerarlo; si aparece en history, jamás se repite.
4. La ventana se revalida con `now()` inyectado: fuera de `[validFrom, validUntil]` o con `now >= expiresAt` hay silencio.
5. La frecuencia usa una única constante nombrada de intervalo mínimo absoluto desde el último `processedAt` válido. Es determinista y segura ante timezone/DST porque compara instantes, no fechas locales. En 7.4 no hay bypass de cooldown por prioridad: una decisión distinta pasa sólo después del intervalo.
6. El historial se copia/ordena defensivamente y nunca se muta. History ausente equivale a `[]`; eso preserva pureza pero no garantiza dedupe entre procesos.
7. Priority se conserva y observa, no se recalcula. No hay scores, ranking nuevo ni semántica de reglas.
8. El clock y, opcionalmente, `timingNow`/observer se inyectan. El observer sólo emite outcome/reason/priority/channel/duración sanitizada; nunca trip/activity ids, dedupe keys, payloads o timestamps de historial.
9. Channel es clasificación conceptual cerrada; no subscribe, send, route, persist ni render.

No se necesita provider, red, endpoint, configuración, persistencia, React o UI. Tests puros deben cubrir gate global, selected null, dedupe permanente, límites exactos de ventana/expiry, history vacío/corrupto tratado defensivamente, cooldown antes/en el/después del límite, decisiones distintas, conservación de priority, mapping cerrado de canales, determinismo/inmutabilidad y observer fallible/sanitizado.

### What NOT to Implement

- Reglas nuevas, reevaluación de Living Context, promoción de `evaluations` o un segundo Decision/Context Engine.
- Cambios a Foundation, Weather, Decision Engine o al comportamiento de `app/lib/companionEngine.js`.
- Copy, IA, chat, Editorial Intelligence, Memory Engine, Push nuevo, notificaciones, email o delivery.
- Persistencia/colecciones, endpoints, providers, red, configuración, feature flags o dependencias.
- UI, Experience, pantallas o preferencias nuevas.
- Adapter legacy activo; sólo documentar el seam y su futura prueba de paridad.
- Archive, push, tags o avance a Etapa 7.5.

### Risks

- **Gating duplicado**: Decision ya valida preferencias por regla, dedupe y ventanas. El Orchestrator debe limitarse al gate global y a vigencia/frecuencia de entrega, no reinterpretar reglas.
- **Ausencia de historial**: sin persistencia externa, dedupe/cooldown sólo son tan completos como el history inyectado. No debe fingirse garantía global.
- **Starvation por prioridad**: volver a ordenar múltiples Act o permitir bypasses puede silenciar indefinidamente decisiones normales; por eso 7.4 consume un solo `selected` y no crea excepciones.
- **Reloj/timezone**: ventanas se comparan como instantes ISO con clock inyectado; cooldown debe ser duración absoluta para evitar errores DST.
- **Paridad JS/TS**: legacy tiene eventos (`returned`, `week-after`), copy y paths sin equivalentes en Decision. Integrarlo sin adapter verificado produciría drift.
- **Canal confundido con delivery**: un label `push` no autoriza construir payload, consultar permisos ni enviar.
- **History inválido**: timestamps no parseables deben ignorarse o producir silencio cerrado según spec, nunca throw ni habilitar un bypass accidental.

### Ready for Proposal

Yes. La propuesta debe congelar el core puro que gatea sólo `ContextDecisionRun.selected`, el cooldown único sin excepciones, el reuse exacto de `dedupeKey`, la clasificación conceptual cerrada y la ausencia total de efectos. Debe mantener el orden de dependencia/archivo Foundation → Weather → Decision → Orchestrator y anticipar slices reviewables porque contratos, tests y documentación pueden acercarse al presupuesto de 400 líneas.
