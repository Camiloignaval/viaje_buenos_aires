# Exploration: First Real Experience — Hoy comienza el viaje

## Current State

La cadena ya existe, pero todavía no tiene un compositor de aplicación. `createLivingContextResolution` deriva `temporal.state` por día calendario del destino; `createContextDecisionRun` vuelve a derivar ese estado con su reloj inyectado y la regla existente `trip-start-today` produce `trip_start_today`; `orchestrateCompanion` consume sólo `decisionRun.selected` y, con preferencias habilitadas e historial vacío, entrega una acción conceptual `in_app`; `createEditorialMessage` acepta esa acción por compatibilidad estructural; `classifyMemory` correlaciona exactamente acción y mensaje y produce un candidato `trip_started`.

No existe hoy `DeliveryIntent`, pipeline de experiencia ni simulador de esta cadena. Tampoco existe un patrón general de composición entre estos cinco módulos. La única herramienta interna comparable es `src/features/dev/StatesGallery.tsx`, montada por `router.tsx` detrás de `import.meta.env.DEV`; modificarla introduciría UI innecesaria para una fase que prohíbe pantallas.

La frontera segura está **fuera** de `src/features/context-engine/`: sus boundary tests prohíben invertir dependencias hacia Companion y Memory. El compositor debe vivir en la feature de aplicación `src/features/experience/`, importar sólo exports públicos y no modificar ninguno de los cinco motores.

### Evidencia exacta

- `app/src/features/context-engine/livingContext.ts` y `temporalContext.ts` — `createLivingContextResolution(...).settled` y derivación con `safeTripTemporalState`.
- `app/src/features/trips/lib/countdown.ts` — “hoy” usa fecha calendario IANA del destino, no UTC ni hora del dispositivo.
- `app/src/features/context-engine/decision/rules.ts` — regla existente `trip-start-today`, prioridad `normal`, preferencia `during_trip`, ventana local e identidad `${tripId}:trip_start_today:${startDate}`.
- `app/src/features/context-engine/decision/engine.ts` — API `createContextDecisionRun`, autoridad única `selected` y `processedKeys` caller-owned.
- `app/src/features/context-engine/companion/{contracts,orchestrator,policy}.ts` — preferencias globales, historial validado, intervalo normal de seis horas y mapping `trip_start_today -> in_app`.
- `app/src/features/context-engine/editorial/{index,editorialVoice}.ts` — `createEditorialMessage` consume una acción estructural exacta y no realiza delivery.
- `app/src/features/context-engine/memory/{policy,lifecycle,observer}.ts` — `classifyMemory` exige lineage acción/mensaje, produce `trip_started`; aceptación es efímera y persistencia real pertenece al repositorio autenticado.
- `app/lib/platformMemory.js` — `persistOnce` requiere request/sesión/membership/Mongo; no corresponde al test puro ni al simulador.
- `app/src/features/context-engine/{companion,editorial,memory}/boundaries.test.ts` — restricciones de imports, I/O, UI, delivery y dependencias upstream.
- `app/src/features/dev/StatesGallery.tsx`, `app/src/app/router.tsx` y `app/vite.config.ts` — precedente dev-only y dead-code elimination; no es necesario modificarlo si el simulador queda como fixture no importado por producción.
- `app/vitest.config.ts` y `app/package.json` — el E2E puro pertenece a Vitest (`src/**/*.test.ts`); `npm test` sólo ejecuta JS Node y no lo cubriría.

### Fixture determinista canónico

Usar una sola instancia/reloj lógico `2026-10-03T15:00:00.000Z`, viaje `trip-1` con inicio `2026-10-03`, fin `2026-10-06` y `America/Argentina/Buenos_Aires`; preferencias Decision `{enabled:true,beforeTrip:true,duringTrip:true}`; `processedKeys=new Set()`; `activities=[]`; preferencias Companion `{enabled:true}`; history/processedKeys Companion vacíos; scope Memory `{ownerUserId:"user-1",tripId:"trip-1",storyId:"story-1"}` y facts `{firstChapterAlreadyOpened:false}`. Living Context no necesita adapters, Story ni datos financieros para esta regla: el módulo temporal settled queda disponible y los demás degradan de forma aislada.

El resultado esperado es `trip_start_today` / canal `in_app` / variante editorial determinista del catálogo V1 / candidato Memory `trip_started`. El E2E puro debe detenerse en `MemoryCandidate`: crear artificialmente un record con estado `persisted` o invocar Mongo desde el simulador saltaría la frontera `Accepted -> MemoryRepository`. La persistencia ya tiene tests propios en `platformMemory.test.js`.

## Affected Areas

- `app/src/features/experience/firstRealExperience.ts` — nuevo compositor puro de aplicación y contratos `DeliveryIntent`/trace; no es motor ni nueva regla.
- `app/src/features/experience/firstRealExperience.test.ts` — E2E puro que usa implementaciones reales y demuestra cada transición sin mocks de motores.
- `app/src/features/dev/firstRealExperienceSimulator.ts` — fixture interno determinista que ejecuta el compositor y devuelve las transiciones para inspección; sin React, ruta, storage ni producción.
- `app/src/features/dev/firstRealExperienceSimulator.test.ts` — prueba que el fixture muestra la cadena y no ejecuta I/O.

Deben permanecer byte-unchanged: `app/src/features/context-engine/livingContext.ts`, `temporalContext.ts`, `decision/**`, `companion/**`, `editorial/**`, `memory/**`, `app/lib/platformMemory.js`, `app/src/story/**`, `app/src/app/router.tsx`, `app/src/features/dev/StatesGallery.tsx`, `app/src/features/pwa/PushCompanion.tsx` y toda entrega Push/UI.

## Approaches

1. **Compositor puro en `features/experience` + fixture dev sin ruta** — encadena APIs públicas, devuelve resultado congelado, `DeliveryIntent` conceptual y trace categórico; el fixture dev sólo prepara inputs deterministas.
   - Pros: menor superficie; no toca arquitectura ni producción; E2E real sin I/O; respeta boundary tests.
   - Cons: el simulador se inspecciona desde test/import de desarrollo y no desde una pantalla.
   - Effort: Medium

2. **Agregar un estado a `StatesGallery`** — renderizar visualmente las transiciones bajo `/dev/states`.
   - Pros: inspección manual inmediata y gate de producción ya probado.
   - Cons: modifica router/gallery, agrega UI cuando está prohibida y mezcla demostración arquitectónica con presentación.
   - Effort: Medium

3. **Componer dentro de Context Engine o persistir Memory** — ubicar el pipeline junto a motores o llamar `platformMemory`.
   - Pros: cercanía física o record Mongo real.
   - Cons: viola las fronteras actuales, introduce request/auth/I/O, deja de ser test puro y convierte composición en un nuevo motor.
   - Effort: High; rechazada

## Recommendation

Elegir el enfoque 1. Implementar una función async pura de aplicación que espere Living Context settled y pase literalmente cada salida a la siguiente API. Si Companion devuelve silencio, debe terminar sin Editorial, Memory ni `DeliveryIntent`; si actúa, debe generar Editorial, clasificar Memory y crear un intent conceptual.

`DeliveryIntent` debe ser un value object congelado, sin autorización ni side effects, con destino cerrado `"push" | "in_app" | "timeline" | "memory"`; para esta experiencia es `in_app`. Debe contener sólo estado `pending` y referencias categóricas mínimas, no copiar texto, payloads, preferencias ni contexto. `editorial` queda excluido porque es una transformación, no un destino futuro.

El trace debe ser caller-owned y best-effort, con campos cerrados como `layer`, `transition`, `outcome`, `decisionKind | none`, `memoryType | none` y `reason | none`. Nunca debe incluir IDs, texto editorial, fechas, destino, scope, evidencia, historial, payloads ni errores crudos. Sus cinco pasos esperados son `living_context/resolved`, `decision_engine/produced`, `companion/transformed`, `editorial_voice/transformed` y `memory/generated`; caminos de silencio/descarte deben registrar sólo la categoría correspondiente.

## Risks

- Un `tripId` o decision id mayor a 128 caracteres haría que Memory descarte el action por su allowlist; el fixture debe usar IDs cortos y el compositor no debe reescribir identidades.
- Living Context expone `initial` y `settled`; usar `initial` podría observar módulos async pendientes. El compositor debe esperar `settled`, aunque esta regla sólo requiere temporal.
- Decision y Companion necesitan el mismo instante lógico para mantener la ventana activa; capturar relojes distintos introduce expiración no determinista.
- Historial Companion ausente/vacío permite actuar; un historial reciente normal produce `frequency_limited`. El fixture canónico debe declarar explícitamente ambos snapshots vacíos.
- Memory sólo admite lineage exacto y copy editorial V1; reconstruir action/message o cambiar canal provocaría `invalid_input`/`lineage_mismatch`.
- Un trace que reutilice observers crudos puede filtrar source/timing o ampliar contratos; conviene emitir eventos propios categóricos desde el seam, no serializar inputs/outputs.
- Aunque el cambio previsto es pequeño, contratos, simulator y tests pueden acercarse al presupuesto de 400 líneas; mantener un único work unit o separar compositor y evidencia si el forecast posterior lo confirma.

## Ready for Proposal

**Yes.** La propuesta puede fijar una composición pura fuera de Context Engine, fixture dev sin ruta, intent sin delivery y Memory hasta `candidate`, manteniendo intactos los cinco motores y la persistencia.
