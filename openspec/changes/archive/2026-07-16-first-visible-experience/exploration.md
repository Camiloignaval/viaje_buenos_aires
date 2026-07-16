## Exploration: first-visible-experience

### Current State

`composeFirstRealExperience()` ya entrega la autoridad completa de la experiencia: un resultado `composed` contiene `EditorialMessage` y exactamente un `DeliveryIntent` pendiente; abstencion, silencio, descarte y error contienen cero intents. La UI productiva todavia no importa este compositor ni su simulador (`app/src/features/experience/firstRealExperience.ts`, `app/src/features/dev/firstRealExperienceSimulator.ts`).

La superficie mas natural es la **Portada del viaje activo** (`/trips/:tripId`), integrada en el ritmo editorial de `ActiveTripHome` despues de la fecha y antes de la entrada al viaje. Es el punto donde la persona ya eligio esa historia; ademas, una PWA reabierta restaura directamente esta portada. La experiencia debe ser una breve intervencion tipografica dentro de la portada, no una card, banner, modal ni alerta.

Evidencia del producto actual:

- `app/src/features/trips/pages/TripHomePage.tsx` ya resuelve sesion, detalle autorizado del viaje, Story Package y lifecycle antes de mostrar la portada.
- `app/src/features/trips/components/ActiveTripHome.tsx` ya posee el hueco editorial entre identidad, temporalidad y CTA; hoy muestra copy temporal derivado, pero no ejecuta Companion.
- `app/src/features/pwa/ContinuityRedirect.tsx` lleva la app instalada al ultimo viaje abierto; la portada es por tanto un destino de llegada real, no una pantalla secundaria accidental.
- `app/src/features/trips/pages/TripsPage.tsx` es una biblioteca/indice. Su viaje destacado es un enlace compacto y el endpoint de lista entrega summaries, por lo que insertar ahi el momento competiria con el indice y con su countdown.
- `app/src/features/personal/pages/PersonalPage.tsx` (`Para ustedes`) es una carta secundaria que agrupa ajustes de acompanamiento, instalacion, feedback y cuenta. Su `personalEditorialMessage()` deriva temporalidad por separado y no es una salida del pipeline; reutilizarlo seria un bypass y llegar alli exige navegacion deliberada.
- `app/src/features/experience/pages/ExperiencePage.tsx` ocurre despues del CTA `Entrar al viaje`: para anunciar que el viaje comienza hoy es demasiado tarde y mezclaria acompanamiento con lectura.
- `app/src/features/pwa/{PushCompanion,PwaInstallPrompt}.tsx` y `app/src/features/experience/components/Banners.tsx` son patrones de permisos/instalacion, no precedentes visuales adecuados: parecen controles o banners y no representan `DeliveryIntent`.
- `app/src/styles/shell.css` provee tokens oscuros, serif editorial, filetes dorados, `clamp()`, safe areas, breakpoint de 640 px, foco visible y motion reducido. No hace falta otro sistema visual.

#### Disponibilidad real de inputs

La portada dispone de `Trip` detallado, `User`, Story Package y progreso local. `getPushPreferences()` expone las preferencias existentes de acompanamiento (`enabled`, `beforeTrip`, `duringTrip`). Con esos valores puede construirse el contexto del caso `trip_start_today` sin inventar fechas, timezone, ownership ni texto. El compositor espera `settled`, de modo que un fallo de inputs o preferencias debe cerrar sin UI.

No existe hoy una fuente productiva de `DecisionInput.processedKeys` ni de `CompanionInput.history`; `pushEvents` solo registra pruebas y `lib/companionEngine.js` no tiene consumidor productivo. Companion permite history/processed keys ausentes y los interpreta como historia vacia, pero Decision exige un set. Para esta **primera** materializacion, un set vacio describe honestamente que el nuevo pipeline aun no ha procesado decisiones productivas; no autoriza persistencia ni eventos. La limitacion es importante: esta fase puede mostrar el primer momento, pero no debe prometer dedupe/frecuencia durable entre recargas hasta que exista una fuente autorizada. Dismiss tampoco puede convertirse en esa fuente.

### Affected Areas

- `app/src/features/experience/firstRealExperience.ts` — autoridad consumida sin cambios; su union discriminada y su intent gobiernan render/silencio.
- `app/src/features/experience/components/AlaiaCompanionMoment.tsx` — componente presentacional propuesto; recibe solo un view model aprobado, no Trip, Context ni reglas.
- `app/src/features/experience/lib/visibleExperience.ts` — adaptador puro propuesto `FirstRealExperienceResult -> visible | silent`; exige `outcome=composed`, un unico intent `in_app/pending` y usa literalmente `message.text`.
- `app/src/features/experience/hooks/useFirstVisibleExperience.ts` — adaptador de aplicacion propuesto para componer con inputs autorizados y cerrar en silencio ante datos incompletos; no decide si hoy comienza el viaje.
- `app/src/features/trips/pages/TripHomePage.tsx` — seam productivo recomendado: aporta sesion/trip/story y monta el resultado junto a la portada.
- `app/src/features/trips/components/ActiveTripHome.tsx` — placement propuesto entre fecha/temporalidad y CTA, fuera del enlace y sin convertir la portada en card.
- `app/src/features/pwa/pushApi.ts` — fuente existente de preferencias; solo lectura, sin pedir permisos ni ejecutar Push.
- `app/src/styles/shell.css` — estilos propuestos con tokens existentes, ancho fluido, foco AA y motion opt-in.
- Tests focales nuevos en `features/experience` y ajustes a `TripHomePage.test.tsx`/`ActiveTripHome.test.tsx` — pipeline real, render, silencio, dismiss, intent, aislamiento y contratos responsive/motion.

Deben permanecer intactos los cinco motores, Story Package, Memory repository/lifecycle, PWA delivery, service worker, email/SMS/timeline, rutas backend y simulador. Tampoco se debe importar `firstRealExperienceSimulator` desde produccion.

### Approaches

1. **Momento editorial integrado en la Portada del viaje activo** — el adaptador ejecuta el compositor y entrega un view model minimo a un componente presente dentro del ritmo de `ActiveTripHome`.
   - Pros: coincide con la intencion de abrir el viaje; PWA llega naturalmente ahi; dispone del detalle autorizado; evita competir con biblioteca o lectura; permite cero UI ante silencio.
   - Cons: la web no instalada requiere abrir el viaje desde `Mis viajes`; history/dedupe durable aun no tiene fuente productiva.
   - Effort: Medium

2. **Intervencion sobre el viaje destacado en `Mis viajes`** — aparece antes o dentro del primer item del indice.
   - Pros: maxima visibilidad en navegador; la ruta raiz normal termina aqui.
   - Cons: contexto de biblioteca, summaries incompletos, posible repeticion con countdown, desplaza todas las historias y puede asociarse ambiguamente si hay varios viajes.
   - Effort: Medium

3. **Reemplazar el mensaje de `Para ustedes`** — usar la salida editorial como carta principal.
   - Pros: lenguaje visual ya contemplativo y mucho aire.
   - Cons: es una superficie secundaria de ajustes; el mensaje existente es otra derivacion temporal y reemplazarlo mezclaria responsabilidades; no es oportuno.
   - Effort: Low

4. **Banner global o entrada en Experience** — render en RootLayout/PWA o al abrir la lectura.
   - Pros: alcance global o cercania al contenido.
   - Cons: banner contextless/invasivo, o mensaje demasiado tardio; requeriria providers globales o acoplar lectura y delivery.
   - Effort: High

### Recommendation

Elegir el enfoque 1. Mantener tres responsabilidades ya permitidas, sin crear motor ni capa arquitectonica:

```text
TripHomePage (inputs autorizados, consultas en paralelo)
  -> composeFirstRealExperience (cinco autoridades existentes)
  -> visibleExperience (proyeccion pura del resultado + DeliveryIntent)
  -> AlaiaCompanionMoment (texto literal + dismiss local)
```

El adaptador visual debe producir `silent` para todo resultado distinto de `composed`, para intents ausentes/multiples o para destino distinto de `in_app`; no muestra placeholder, error ni fallback. El componente no recibe contexto, decision, memoria ni preferencias y no puede autorizar delivery. Dismiss es solo `useState` local al montaje: oculta la representacion, emite como maximo la observacion UI categorica `dismissed` y no escribe localStorage/sessionStorage, Memory, Decision, Companion ni eventos de dominio.

Visualmente debe parecer una nota integrada: un filete dorado tenue, eyebrow pequeno `Alaia`, texto editorial literal en serif/italica (maximo aproximado 30ch) y cierre discreto con objetivo tactil minimo de 44x44. Sin fondo de card, sombra, icono de alerta ni CTA propio. Usar estructura `aside` con nombre accesible; no `role=alert` ni `aria-live`, porque es acompanamiento no urgente y anunciarlo asincronamente generaria ruido. El boton de cierre requiere nombre accesible y foco visible AA.

La composicion debe comenzar en paralelo con las consultas ya necesarias y el primer paint completo de la portada debe usar el resultado resuelto cuando este disponible; ante fallo o incompletitud, la portada aparece sin momento. No se debe reservar un placeholder visible. La entrada usa solo opacity y un desplazamiento vertical minimo bajo `prefers-reduced-motion: no-preference`; con `reduce`, no hay animacion. `clamp()`, `max-width`, safe areas y el breakpoint existente de 640 px cubren mobile/tablet/desktop sin anchos fijos ni overflow.

Observabilidad propuesta, best-effort e inyectable como los observers existentes: `flow_started`, `result` con solo `stage/outcome/reason`, `rendered`, `dismissed`, `silence`. Nunca texto, IDs, Trip, intent completo, payload, PII ni error crudo. `silence` incluye abstencion, Companion silence, discard, error o intent no representable como categorias cerradas.

La cobertura debe probar el pipeline real sin mocks de motores; mapeo exacto del intent; texto proveniente del `EditorialMessage`; cero render en todos los terminales; dismiss sin mutar result/intents/Memory ni producir dominio; observer hostil; no imports de simulador, Push delivery, storage, Story rules o motores desde el componente; accesibilidad; CSS responsive y `prefers-reduced-motion`. JSDOM no demuestra layout fisico: las pruebas mobile/desktop deben verificar contratos de estructura/clases y el CSS, sin afirmar evidencia visual que no existe.

**Review Workload Forecast:** riesgo alto de superar 400 lineas incluyendo tests (estimado 550-800). Implementar como dos unidades autonomas: (1) proyeccion pura + componente + accesibilidad; (2) adaptador runtime + integracion TripHome + estilos/boundaries. Mantener tests con cada unidad.

### Risks

- No hay history/processed store productivo: el primer momento es legitimo, pero frecuencia/dedupe entre recargas no puede demostrarse ni debe simularse con dismissal storage.
- Las preferencias viven bajo `/api/push/preferences` aunque la UI las presenta como `Acompanamiento`; reutilizarlas evita inventar otra preferencia, pero se debe documentar que no activa Push.
- `ActiveTripHome` ya muestra dos lineas temporales; el diseno debe evitar repetir el mismo significado. La nota aprobada debe ocupar el lugar de la segunda linea emocional cuando exista, conservando el countdown factual; en silencio queda el comportamiento previo.
- Esperar consultas adicionales puede retrasar el momento; deben correr en paralelo y fallar cerrado sin bloquear la portada por errores recuperables.
- Una animacion de altura produciria layout shift; queda prohibida. Solo opacity/transform sobre el espacio que llega con el primer render resuelto.
- No existe transporte analytics general; agregar uno ampliaria alcance. El observer categorico debe quedar como seam, no como red o persistencia disfrazada.

### Ready for Proposal

Yes. Proponer la Portada del viaje activo como unica superficie, con proyeccion pura de un `FirstRealExperienceResult`, presentacion sin reglas y adaptador runtime fail-closed. La propuesta debe aceptar explicitamente la limitacion de history/dedupe durable, prohibir resolverla en dismiss o storage, y mantener la entrega real fuera de alcance.

---

## Evolution: Companion Experience closure

### Current State

La experiencia verificada ya resuelve correctamente un primer montaje, pero no la continuidad que ahora se exige. `useFirstVisibleExperience()` captura `processedKeys` e `history` vacios en cada instancia; `VisibleCompanionExperience` conserva `dismissed` solo en `useState`; al salir de `/trips/:tripId`, recargar o volver a una ruta cacheada React puede crear otra instancia y volver a evaluar la misma accion. TanStack Query conserva sesion y viajes durante la SPA, pero no es un ledger de delivery y no sobrevive una recarga.

El router no posee un provider de Companion: `RootLayout` solo aporta `Suspense` y `AppProviders` un `QueryClientProvider`. Las rutas lazy desmontan `TripHomePage` al navegar a otra vista. Ademas, cambiar `:tripId` puede reutilizar el mismo tipo de componente cuando el nuevo query ya esta cacheado; `SettledTripHome` no tiene `key` y el hook conserva el primer `source` mediante `useState(() => source)`. Por eso la identidad del montaje debe fijarse explicitamente por usuario y viaje, no depender accidentalmente del remount del router.

La infraestructura de navegador ya disponible permite cerrar el alcance sin dominio nuevo:

- `sessionStorage` se usa para estado efimero por sesion en `app/src/features/experience/hooks/useExperience.ts` (`alaia:intro-video-2-seen:${scope}`), con lectura/escritura protegida por `try/catch`.
- No existe un adaptador generico de `sessionStorage`. Los adaptadores existentes son especificos de su feature e inyectan `Storage` (`openingStorage.ts`, `sessionCache.ts`, `continuityStore.ts`). Reusar `continuityStore` seria incorrecto: usa `localStorage` y representa posicion durable de viaje, no lifecycle visual.
- `localStorage`, IndexedDB, Memory Engine y backend exceden la vida requerida y constituirian persistencia paralela. Un store solo en memoria cubriria navegacion SPA, pero **no recarga**. El mecanismo minimo legitimo es por tanto un adaptador seguro, feature-local, sobre el `sessionStorage` existente; si no se puede leer y verificar escritura, la experiencia debe guardar silencio en vez de mostrar algo que no pueda controlar durante la sesion.

Companion ya define toda la frecuencia necesaria. `validateCompanionHistory()` une `processedKeys` e `history`; `evaluateCompanionFrequency()` aplica el intervalo base existente de seis horas y el bypass high existente de una hora. No corresponde duplicar esos calculos. La UI solo puede aportar evidencia caller-owned de entregas que efectivamente llegaron a `visible`; `pending` no cuenta como procesada y `dismiss` no crea una segunda verdad.

### Lifecycle and identity

El receipt de sesion debe contener solo datos estructurados ya emitidos por el pipeline, nunca copy ni payloads:

```text
scope: authenticated user
identity: userId + tripId + actionId/dedupeKey + intent.destination
facts: priority, decision.window.expiresAt, state, visibleAt
state: pending -> visible -> dismissed -> expired
                 \---------------------> expired
```

`pending` nace unicamente despues de que el compositor entrega un unico `DeliveryIntent pending/in_app` valido. `visible` se confirma despues del commit real del `<aside>`; ese instante existente se usa como `processedAt`. `dismissed` actualiza el mismo receipt y suprime la representacion durante el resto de la sesion autenticada. `expired` se deriva exclusivamente de `action.decision.window.expiresAt`/`validUntil` (usar el limite efectivo mas temprano si difieren), sin TTL editorial inventado. Un timer UI puede cerrar el nodo mientras la ruta sigue montada; la lectura siguiente realiza la misma transicion de forma perezosa si la ruta estaba desmontada.

Los receipts `visible`, `dismissed` y `expired` siguen aportando `dedupeKey` a ambos `processedKeys` durante esa sesion: expirar la posibilidad de mostrar no hace que una decision ya mostrada vuelva a ser nueva. Su `visibleAt` alimenta `CompanionInput.history`; Companion, no el adapter, decide si aun aplica frecuencia. Los receipts `pending` no alimentan history y pueden reintentarse tras navegacion/recarga hasta que expiren. Los registros se filtran por usuario; cambiar de cuenta inicia otro scope. No se escribe Decision, Memory, Editorial ni ninguna API.

### Continuity behavior

| Caso | Comportamiento derivado |
|---|---|
| Misma ruta y rerender | Un snapshot y un receipt; no recompone ni duplica eventos. |
| Salir y volver al mismo viaje | `visible`/`dismissed` suprimen repeticion; `pending` puede completar; `expired` permanece terminal. |
| Recarga en la misma pestana | `sessionStorage` reconstruye processed keys/history y conserva dismiss/frecuencia. |
| Cambio de ruta sin viaje | No se monta superficie, placeholder, wrapper ni observer residual. |
| Cambio a otro viaje | Dedupe sigue siendo por accion/viaje; history del mismo usuario activa la politica global conservadora ya existente. No se inventa una excepcion por viaje. |
| Cambio de usuario | Receipts de otro usuario no se leen ni afectan frecuencia; el `key` de montaje fuerza un snapshot nuevo. |
| Storage no disponible | Silencio natural. Un fallback de modulo no puede prometer continuidad tras reload y no debe presentarse como solucion completa. |

Poblar `DecisionInput.processedKeys` y `CompanionInput.processedKeys/history` es apropiado solo con receipts `visible` o posteriores: son entradas caller-owned que informan a los motores de una decision ya representada, sin modificar los motores ni afirmar persistencia de dominio. `dismiss` por si solo nunca agrega una decision, cambia prioridad ni toca Memory.

### Real pipeline cases

Las cuatro experiencias no equivalen a cuatro mensajes in-app y no deben forzarse a hacerlo:

- **Hoy comienza el viaje:** la regla real selecciona `trip_start_today`, Companion asigna `in_app`, Editorial produce el copy y Memory produce `trip_started`; es el unico happy path visible actual.
- **Manana comienza el viaje:** la regla real `trip_start_tomorrow` asigna `timeline`; Memory V1 lo descarta como `unsupported_kind`, por lo que `firstRealExperience` termina `memory_discard` con cero intents. La UI debe guardar silencio. Implementar Timeline esta expresamente prohibido.
- **Ultimo dia:** `trip_last_day` produce Memory candidata pero Companion asigna canal `memory`; el intent no es `in_app` y la proyeccion existente lo rechaza. La UI debe guardar silencio, sin convertirlo a otro destino.
- **Companion guarda silencio:** preferencias deshabilitadas, `already_processed` o `frequency_limited` terminan antes de Editorial/Memory y entregan cero intents; la portada conserva exactamente su copy previo sin wrapper.

Faltan pruebas integradas de los casos ultimo-dia y continuidad. Las pruebas existentes demuestran hoy y preferencia deshabilitada; `firstRealExperience.test.ts` ya demuestra manana como descarte. La evolucion debe ejecutar los cinco motores reales con relojes/fixtures de destino para hoy, manana, ultimo dia y silencio, y afirmar tanto artefactos producidos como ausencia de UI cuando el destino no es `in_app`.

### UX, accessibility and observation audit

La representacion actual no presenta un defecto objetivo que justifique redisenarla: esta en flujo, usa jerarquia editorial existente, target de 44 px, foco visible, `aside` etiquetado, decoracion oculta, sin `alert`/`aria-live`, ancho fluido y motion solo bajo `no-preference`. Se debe conservar. El cierre elimina el control enfocado porque elimina el mensaje completo, comportamiento esperado para un dismiss explicito; no hace falta anuncio adicional. En silencio no debe existir ni el `<aside>` ni un contenedor reservado.

La animacion actual de 280 ms y `translateY(0.25rem)` no altera geometria; `prefers-reduced-motion: reduce` ya la anula. Solo se requiere probar que una rehidratacion suprimida no reinicia la animacion y que la expiracion restaura el fallback sin live-region. No hay evidencia para cambiar spacing, color o identidad visual.

La allowlist actual (`flow_started`, `result_layer`, `render_success`, `dismiss`, `silence`) ya protege contenido y PII. Para cerrar lifecycle se debe agregar solo `delivery_pending` y `delivery_expired`; `render_success` representa `visible` y `dismiss` representa `dismissed`, evitando eventos duplicados. Los eventos siguen siendo objetos congelados con exactamente `{kind}`. La supresion por receipt termina en `silence`; no expone causa, identidad, tiempo ni estado almacenado.

### Smallest change set

1. Crear `app/src/features/experience/lib/visibleDeliverySession.ts` y su test: parser allowlist, `Storage` inyectable, probe seguro, scope usuario, identidad de receipt, transiciones, expiry derivada y proyeccion a processed keys/history. No provider ni repository.
2. Evolucionar `useFirstVisibleExperience.ts`: leer el snapshot de sesion antes de componer, pasar sets/history caller-owned, registrar `pending`, exponer callbacks puros `onVisible/onDismiss`, programar expiry y fallar a silencio si el storage no garantiza la sesion.
3. Evolucionar `VisibleCompanionExperience.tsx` solo para invocar esos callbacks en render/dismiss; sigue sin conocer Trip, Decision, intent, storage o lifecycle records.
4. En `TripHomePage.tsx`, keyear `SettledTripHome` por `user.id + trip.id` y cablear callbacks. No tocar router, providers, engines, Story, compositor ni PWA.
5. Extender el spec/design/tasks/tests **del mismo cambio** para continuidad SPA/reload, cambio de viaje/usuario, estado pending-visible-dismissed-expired, storage inaccesible, cuatro fixtures reales, observabilidad y boundaries. La regla anterior que prohibia storage debe evolucionar para permitir unicamente este adapter `sessionStorage` feature-local y seguir prohibiendo `localStorage`, IndexedDB y persistencia remota.

### Approaches

1. **Receipt efimero en `sessionStorage` + Companion caller-owned history** — recomendado.
   - Pros: sobrevive reload y rutas en la pestana, conserva dismiss, reutiliza frecuencia/dedupe existentes y no crea verdad de dominio.
   - Cons: una pestana nueva es otra sesion; storage bloqueado obliga a silencio.
   - Effort: Medium.
2. **Store de modulo/React solamente**.
   - Pros: minimo y sin serializacion.
   - Cons: no cubre reload; incumple el alcance explicito.
   - Effort: Low, insuficiente.
3. **Query cache, continuity localStorage, Memory o backend**.
   - Pros: mayor durabilidad.
   - Cons: mezcla lifetimes, duplica persistencia o dominio, y viola las prohibiciones.
   - Effort: High, descartado.

### Recommendation

Evolucionar `first-visible-experience` con el enfoque 1, sin abrir otro change. Tratar el receipt como estado efimero de delivery, no como Memory ni historial de negocio. SessionStorage es la unica infraestructura existente cuya vida coincide con “durante toda la sesion” y reload; el adapter debe ser pequeno, defensivo e inyectable. La arquitectura sigue siendo:

```text
session delivery receipts -> caller-owned processedKeys/history
real pipeline -> pending/in_app -> visible UI -> dismissed/expired receipt
terminal o destino no in_app -> natural silence
```

### Risks

- Una pestana nueva no comparte dismiss/frecuencia; ampliar eso exigiria persistencia durable y queda fuera del mandato.
- Si `sessionStorage` no esta disponible, no se puede cumplir reload con un store de modulo; el cierre conservador es no mostrar.
- La frecuencia global entre viajes puede sorprender, pero es la politica Companion existente; cambiarla seria una nueva regla.
- Manana y ultimo-dia no son visibles por sus contratos actuales. Forzarlos a `in_app` violaria canales, Memory o las prohibiciones de Timeline/nuevas reglas.
- El cambio completo probablemente agregue 650-900 lineas con tests: `400-line budget risk: High`, `Chained PRs recommended: Yes`, `Decision needed before apply: No` bajo `auto-chain`. Slices autonomos: (1) adapter/lifecycle; (2) hook/component/remount; (3) cuatro pipelines + boundaries/verificacion.

### Ready for Proposal

Yes. Actualizar propuesta, spec, design y tasks existentes con el receipt de sesion y los limites anteriores. No crear change, provider, motor, regla, canal ni persistencia adicional.
