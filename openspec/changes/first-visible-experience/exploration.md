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
