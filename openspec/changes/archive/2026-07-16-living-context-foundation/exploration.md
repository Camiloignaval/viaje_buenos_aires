## Exploration: Living Context Foundation

### Qué revisar primero

1. La decisión principal es **evolucionar `app/src/features/context-engine/`**, no crear otro engine ni un endpoint agregador.
2. `Trip.destination` y sus fechas deben ser la autoridad del viaje; el Story Package aporta contexto curado y `User` aporta preferencias. El campo `Trip.travelContext` es texto libre narrativo, no el futuro snapshot tipado.
3. El primer corte seguro debe componer lógica existente (`resolveTravelContext`, `tripTemporalState`, `FinancialContextModule`, Story Intelligence) mediante un resolver puro con reloj y adaptadores inyectados. Clima, feriados, eventos, transporte, alertas, ubicación y geofencing quedan solo como extensión diseñada.

### Current State

#### 1. El Context Engine real ya existe y es pequeño

- `app/src/features/context-engine/types.ts:47` define el contrato genérico `ContextModule<TInput, TResult>`; `contextEngine.ts:8-22` mantiene un `Map`, expone registro/lookup y registra `FinancialContextModule`. El registro reemplaza silenciosamente nombres repetidos y pierde tipos en `unknown`; sirve como catálogo mínimo, no como orquestador.
- `travelContext.ts:27-86` ya define el snapshot `TravelContext` y el resolver síncrono, sin React, red ni storage. Reutiliza `currencyCatalog` y `localeCatalog`, acepta overrides curados de idioma/moneda y conserva el timezone recibido. No está registrado porque no es async.
- `localeCatalog.ts:37-86` es la fuente curada país → idioma/sistema de medidas/ciclo horario y construye locale BCP-47. Cubre AR, CL, UY, PE, CO, MX, ES, BR, JP, US y GB; país desconocido devuelve idioma/locale nulos pero medidas/ciclo por defecto.
- `financialContextModule.ts:32-71` es el único módulo dinámico registrado. Tolera ausencia/falla, diferencia `fresh | stale | unavailable` y conserva moneda local como protagonista. `useFinancialContext.ts:13-25` añade TanStack Query con `staleTime` de una hora y sin retry.
- El backend financiero ya está separado por responsabilidades: provider (`app/lib/context/exchangeRateProvider.js`), cache memoria+Mongo con deduplicación in-flight y fallback stale (`exchangeRateCache.js:9-94`), endpoint autenticado (`routes/context/exchange-rates.js`) y colección `contextExchangeRates` (`platformMongo.js:16,74`). No debe reimplementarse.

#### 2. El contexto de destino y temporal ya existe, pero la composición está dispersa

- El dueño factual del destino seleccionado es `Trip.destination`: país, ciudad, coordenadas y timezone persistido (`app/src/features/trips/types.ts:5-14`, validado también en `app/lib/platformTrips.js:69-106`). El timezone se resuelve al buscar/crear el destino con `tz-lookup` (`app/lib/platformGeo.js`); no corresponde recalcularlo al consumir contexto.
- `resolveTravelContext` se usa hoy desde `travelContextFromStory` (`app/src/features/experience/lib/travelPreparations.ts:118-126`), que arma contexto desde metadata de Story y **no recibe el Trip**. Esto alcanza para preparativos editoriales, pero no para un snapshot vivo del viaje.
- `tripTemporalState` (`app/src/features/trips/lib/countdown.ts:37-78`) ya resuelve before/tomorrow/today/during/last-day/just-finished/memory por día calendario en el timezone destino y tiene wrapper defensivo (`safeTripTemporalState`, líneas 80-91). Sus tests cubren timezone destino, DST, límites y fechas inválidas.
- La misma función se invoca desde varias superficies: `TripEntry.tsx:14-16`, `personalMessage.ts:25`, `initialDestination.ts` y `TripHomePage.tsx:43`. No duplican la fórmula principal, pero cada consumidor vuelve a componer inputs/reloj y `TripHomePage` crea `new Date()` dentro de React.
- Hay duplicación de primitivas de calendario entre `trips/lib/countdown.ts` y `story/engine/storyProgress.ts` (`calendarOrdinal`, parsing y día calendario). Además `useExperience.ts:48,88` captura `new Date()` una sola vez y calcula Story View con ese instante, mientras el lifecycle del Trip usa otro reloj.
- El Companion backend implementa otra conversión local propia (`app/lib/companionEngine.js:3-18`) y sus tests usan instantes UTC, aunque el modelo Trip persiste `YYYY-MM-DDTHH:mm` local. Este desacople es un riesgo real de borde de fecha; no debe “arreglarse” modificando Companion en 7.1, sino documentarse y cubrirse mediante compatibilidad futura.

#### 3. Ownership verificado

| Dato | Dueño actual | Fuente/provenance | Clasificación y observaciones |
|---|---|---|---|
| `tripId`, `baseStoryId`, fechas, viajeros, destino elegido, timezone, duración/perfil | Trip | Mongo/API `Trip`; tipos en `features/trips/types.ts`, normalización en `platformTrips.js` | Contexto de viaje. `baseStoryId` es la relación con contenido curado. |
| `storyId` interno del package | Story Package | `story-ba2026.json:2` (`story-ba-2026`) | Curado. Es distinto del id de catálogo `baseStoryId = ba-2026` (`platformStories.js:4`); ambos deben conservarse sin fingir que son equivalentes. |
| destination/country/language/currency editoriales | Story Package | `metadata.destination`, `destinationCountryCode`, `destinationLanguage?`, `budget.currency` | Curado. Las fechas `metadata.travelDates` pertenecen al contenido base, **no** sustituyen las fechas del Trip real. |
| Story Mood, Story Intelligence, capítulos/current chapter | Story Package + Story Engine/progreso | `storyMood`, intelligence de actividades/lugares, `getStoryView` | Curado/derivado narrativo. Sin metadata, no se infiere. |
| residencia, `preferredCurrency` | User | sesión/API; `auth/types.ts:4-13`, `platformUsers.js:33-37` | Contexto de usuario. La moneda se deriva por preferencia → residencia → USD en `preferredCurrencyResolver.ts`. No existe todavía locale preferido persistido. |
| preferencias de acompañamiento | User | `pushPreferences` en Mongo (`platformPush.js:107-131`) | Contexto de usuario, específico de Companion/Push. No debe activar comportamiento nuevo. |
| capacidades PWA del dispositivo | Device/subscription | `getPwaCapabilities(window)` y capabilities guardadas por suscripción (`platformPush.js:67-85`) | Contexto de dispositivo, no propiedad estable del User ni del Trip. Depende de `window`, por lo que solo entra mediante adapter opcional React/browser. |
| hora/fecha local y estado temporal | Reloj + Trip timezone/fechas | reloj inyectado + `tripTemporalState` | Dinámico local; no requiere proveedor externo. |
| tasas y conversión | Financial Context | Frankfurter detrás del backend, cache memoria/Mongo | Dinámico externo con stale fallback. |
| locale, idioma, sistema de medida/ciclo horario por país | Catálogo Alaia | `localeCatalog.ts` | Curado por aplicación; fallback explícito, no provider dinámico. |
| clima, feriados, eventos, transporte, alertas, ubicación | No implementado | requerirían reloj/proveedor/dispositivo según módulo | Solo contratos/puntos de extensión en esta etapa. |

#### 4. Duplicaciones y colisiones semánticas

- **Destino:** Trip guarda país/ciudad/timezone; Story vuelve a declarar destino/country; `travelPreparations.ts` además mantiene `COUNTRY_NAMES`, mientras el Trip ya guarda `countryName`. Precedencia propuesta: Trip para el viaje real; Story solo para enriquecimiento curado asociado al mismo `baseStoryId`; catálogos como fallback, nunca al revés.
- **Moneda:** `StoryPackage.budget.currency` es moneda local editorial; `Trip.travelBudget.currency` es la moneda del presupuesto elegido por el usuario y no debe tratarse como moneda local; `currencyCatalog.ts` deriva por país. El allowlist TS y JS está duplicado deliberadamente por frontera cliente/servidor, pero debe verificarse como contrato compartido en tests.
- **Idioma/locale:** `metadata.language` es idioma del contenido; `destinationLanguage` es idioma predominante del destino; `localeCatalog` lo deriva por país. No deben colapsarse. User no tiene locale preferido persistido.
- **“Travel context”:** `Trip.travelContext` (`types.ts:77`, `platformTrips.js:138-146`) es texto libre del usuario, mientras `TravelContext` es un objeto tipado. El Living Context debe usar un nombre inequívoco y exponer ese texto, si se necesita, solo como contexto narrativo privado y mínimo.
- **Temporal:** la regla de lifecycle se reutiliza, pero calendario local/ordinal aparece en Trips, Story Progress y Companion. La centralización debe partir de `tripTemporalState`; no conviene fusionar de inmediato Story Progress porque sus reglas y ownership son distintos.
- **Narrativa en presentación:** `ChapterSections.tsx:80-105,331` resuelve preferred currency, conversión y líneas de intelligence dentro del árbol React. `travelPreparations.ts` deriva preparativos por fuera de React, pero desde Story solamente. La futura composición debe salir de los componentes; la presentación conserva solo copy/render.
- **Mongo:** conviven `platformMongo.js`, `mongodb.js` y `alaiaMongo.js` por legado. Toda extensión de contexto backend debe usar `platformMongo.js`; no abrir otra conexión/colección ni migrar infraestructura legacy dentro de este cambio.

#### 5. Frescura, errores, cache y observabilidad reales

- El endpoint de tasas entrega `source`, `fetchedAt` y `stale` (`routes/context/exchange-rates.js:46-61`), y Mongo guarda `expiresAt`; `FinancialContextModule` descarta source/fetchedAt/expiresAt y conserva solo `rateDate` + freshness. La evolución debe ampliar el contrato existente de forma compatible o adaptar explícitamente esa provenance; no consultar al proveedor desde Living Context.
- El patrón de resiliencia ya está establecido: provider envuelve fallas externas, cache cae a stale/null, cliente financiero atrapa red y devuelve null, módulo devuelve unavailable y la UI omite conversión. Living Context debe preservar resultados parciales y no convertir módulos opcionales en error global.
- TanStack Query tiene un `QueryClient` único con defaults PWA (`providers/queryClient.ts`); las queries de Trip y Story ya tienen keys `['connected','trip',id]` y `['connected','story',baseStoryId]`. Un hook futuro debe recibir/reutilizar esos datos o sus mismas queries, no disparar un endpoint monolítico ni waterfalls.
- No hay una capa de métricas/telemetría de contexto. La observabilidad mínima debe ser un callback/recorder inyectable y seguro (módulos, status, source, duración), desactivable y sin PII, presupuesto, notas, contenido privado, coordenadas exactas ni tokens.
- `platformConfig.js` es el servicio de configuración real (funciones `buildPlatformConfig/getPlatformConfig`), no existe una clase `ConfigService`. No hace falta crearla. Un proveedor futuro añadiría config allí solo cuando exista una integración real.

#### 6. Backend, API, PWA y offline-first

- Todas las rutas pasan por `app/api/index.js` + `app/lib/apiRoutes.js`; `/api/context/exchange-rates` ya está consolidado. El primer Living Context puede componerse en frontend con Trip/User/Story ya cargados y reloj local; no hay necesidad probada de endpoint nuevo ni Vercel Function.
- La PWA precachea shell/assets y navegación (`vite.config.js`, `src/sw.ts`), pero no implementa runtime cache de API. Living Context no puede bloquear la experiencia si Trip/Story/finance no están disponibles; debe aceptar snapshots ya disponibles y degradar por módulo.
- `getPwaCapabilities` depende de `window`; el resolver de dominio no debe importarlo. Push preferences y device capabilities pueden llegar como input opcional/adaptador, pero no deben producir nuevas notificaciones ni decisiones Companion.
- Companion sigue determinístico, idempotente y separado. Solo debe definirse en diseño un DTO/adaptador futuro; no cambiar eventos, copy, scheduler ni envío en esta fase.

#### 7. Health Check, tests, documentación y OpenSpec

- Health Check ya es puro, tolerante a fallos y extensible mediante checkers (`healthCheck.ts:488-513`). Hoy valida destination superficialmente, moneda, Story Intelligence y ausencia de hint monetario, pero no valida timezone, locale resoluble, `destinationCountryCode`, moneda local irresoluble ni coherencia narrativa más allá de `indoor + outdoor`.
- Las nuevas señales deben ser warning/info para datos curados incompletos; ausencia de módulos dinámicos no implementados nunca es critical. Stories legacy deben seguir siendo aceptables.
- Ya existen tests sólidos para TravelContext/locale/financial/cache/provider/temporal/Health Check/Story Engine/Companion/PWA continuity. No existen todavía resolver Living Context, Narrative Context ni hook Living Context; tampoco cobertura directa de `PushCompanion`/capabilities. La suite futura debe concentrarse en composición parcial, reloj inyectado, no mutación, precedence, provenance/freshness y no duplicación de requests.
- Documentación activa relevante: `app/documentacion/ALAIA_ETAPA_6_8_PRODUCT_EXCELLENCE.md` ordena evolucionar el engine existente sin módulos vacíos ni mega-service; `31_ALAIA_REFINAMIENTO_EDITORIAL_ETAPA_6.md` prohíbe reabrir/rediseñar Etapa 6; `STORY_PACKAGE_SCHEMA_v1.4.md` define Intelligence; `WEB_PUSH_ACOMPANAMIENTO.md` delimita Companion/Push. El OpenSpec vigente no contiene todavía specs de contexto; solo config, specs base y cambios anteriores.

### Affected Areas

- `app/src/features/context-engine/` — dueño natural del contrato/resolver Living, adapters y hook mínimo; se debe extender, no duplicar.
- `app/src/features/trips/lib/countdown.ts` — fuente temporal a reutilizar y, si el diseño lo justifica, exponer primitivas seguras sin cambiar copy.
- `app/src/features/trips/types.ts` y `app/src/features/auth/types.ts` — inputs existentes; evitar cambios persistidos anticipados.
- `app/src/features/story/engine/{types,intelligence,storyEngine}.ts` — metadata narrativa curada y current chapter ya resuelto.
- `app/src/features/story/health/` — checkers incrementales de destination/context/intelligence.
- `app/src/features/connected/hooks/` y `app/src/providers/queryClient.ts` — integración React sin waterfalls ni queries duplicadas.
- `app/lib/context/`, `app/routes/context/exchange-rates.js`, `app/lib/platformMongo.js` — infraestructura financiera existente que solo debe consumirse mediante adapter.
- `app/lib/companionEngine.js`, `app/lib/platformPush.js`, `app/src/features/pwa/` — límites de compatibilidad; sin cambio funcional en 7.1.
- `app/lib/apiRoutes.js`, `app/api/index.js`, `app/lib/platformConfig.js` — fronteras backend existentes; no requieren endpoint/config nuevo en el primer corte.

### Approaches

1. **Resolver compuesto dentro del Context Engine existente (recomendado)** — agregar un contrato pequeño `LivingTravelContext` y un `resolveLivingContext(input, deps)` en `features/context-engine`, compuesto por adapters temporal, destination, financial y narrative. El input recibe snapshots Trip/User/Story opcionales; deps recibe clock, financial resolver y observabilidad. Los módulos base resuelven sync y los opcionales async en paralelo, siempre con resultado parcial.
   - Pros: evoluciona lo existente; usable sin React/window; determinístico; ownership/provenance explícitos; reutiliza cache/query/backend; permite adapter futuro para Companion.
   - Cons: exige definir precedencia y compatibilidad entre ids/datos legacy; probablemente ampliar FinancialContext para no perder provenance.
   - Effort: Medium.

2. **Convertir el registry actual en un orquestador/pluggable graph** — registrar destination, temporal, narrative y finance y resolver dependencias dinámicamente por nombre.
   - Pros: extensibilidad uniforme y descubrimiento automático.
   - Cons: el registry actual no es type-safe, reemplaza duplicados silenciosamente y no modela dependencias; introduce factories/grafo/módulos vacíos contra las reglas de Etapa 6.8. Mayor costo de pruebas y trazabilidad sin valor actual.
   - Effort: High.

3. **Endpoint backend monolítico `/api/context/living`** — cargar Trip/User/Story y proveedores en servidor y devolver todo.
   - Pros: una respuesta de red y composición centralizada.
   - Cons: duplica queries ya activas, acopla datos locales/curados a Mongo, empeora offline-first, crea un punto único de falla y anticipa proveedores. No existe necesidad real para destination/temporal/narrative.
   - Effort: High.

### Recommendation

Adoptar el enfoque 1. La propuesta posterior debería fijar estas fronteras:

- Un único resolver en `features/context-engine` con **inputs explícitos** (`trip`, `user`, `storyPackage`, progreso/storyView opcional) y **dependencias inyectadas** (`now`, financial adapter, observer). Sin globals ocultos, `window`, fetch directo ni React.
- Composición por origen, no por pantalla: `destination` desde Trip con enriquecimiento Story/catalog; `temporal` desde `tripTemporalState`; `financial` como adapter de `FinancialContextModule`; `narrative` como selección literal de Story Mood/Intelligence/current chapter, sin generar texto ni inferir.
- Resultado parcial con capability booleans derivados y status/provenance por módulo. Aplicar `fresh | stale | unavailable` a módulos dinámicos; para datos estáticos registrar source/owner sin inventar timestamps de fetch.
- Preservar ambos ids (`baseStoryId` de catálogo y `storyId` del package). Validar que el package recibido corresponde al base story resuelto antes de usar overrides.
- Definir precedencia explícita: Trip es autoridad de destino/fechas; Story aporta metadata curada; User aporta preferencia; catálogos son fallback; proveedor solo aporta dinámico. `Trip.travelBudget.currency` nunca equivale automáticamente a moneda local.
- Hook React delgado que componga datos de `useConnectedTrip`, `useStoryContent` y sesión ya existentes, o use las mismas query keys; finance es opcional y no bloquea el snapshot base. No agregar UI productiva en 7.1.
- Health Check se extiende con warnings reales de metadata curada; no se registran módulos vacíos para clima/feriados/etc. La guía de extensión documenta cómo añadir un adapter cuando exista proveedor/config/cache/test real.

### What NOT to implement in 7.1

- Segundo Context Engine, `ContextManager`, global React provider, mega-service, graph/factory genérico o registry de módulos null.
- Endpoint monolítico, nueva Vercel Function, nueva conexión Mongo, colección genérica de context snapshots o `ConfigService` nuevo.
- Proveedores productivos de clima, feriados, eventos, transporte, electricidad, alertas, ubicación aproximada o geofencing.
- IA/LLM, texto generado, recomendaciones, cambios de itinerario, nueva UI/pantallas/configuración.
- Cambios funcionales en Companion, scheduler, eventos, preferencias, Web Push, copy o notificaciones.
- Persistir locale del usuario o capability del dispositivo en User sin una historia de producto y contrato de privacidad aprobados.
- Reabrir la UI/editorial de Etapa 6 ni modificar “Mis viajes”/“Para ustedes” salvo la conexión mínima posterior al resolver.

### Risks

- La colisión `Trip.travelContext` (texto) vs `TravelContext` (objeto) puede producir un contrato confuso si no se nombra y documenta con rigor.
- Story y Trip duplican destino/fechas con objetivos distintos; una precedencia incorrecta puede mostrar el viaje base en vez del viaje real.
- El contrato financiero actual pierde parte de la provenance/timestamps que ya existen en backend; envolverlo sin ampliar su salida podría inventar metadata.
- `Intl` lanza con timezone inválido; todos los adapters temporales deben degradar a unavailable, no propagar al resolver completo.
- `companionEngine` y Story Progress tienen relojes/semánticas temporales distintas; intentar centralizarlos todos en este corte ampliaría riesgo y alcance.
- Un hook que vuelva a pedir Trip/Story creará waterfalls y romperá offline-first; la integración debe reutilizar snapshots/query cache existentes.
- El cambio completo probablemente supere 400 líneas por contratos, adapters, health checks y tests; `sdd-tasks` debe prever slices revisables antes de apply.
- El working tree contiene cambios ajenos, incluido `PushCompanion.tsx`; fases posteriores deben preservar y aislar esos cambios.

### Ready for Proposal

**Sí.** El repositorio ya tiene una base suficiente y la dirección no requiere una segunda arquitectura. La propuesta debe limitar el primer incremento a contrato/resolver compuesto, cuatro adapters de bajo riesgo, hook mínimo y Health Check/tests; los proveedores dinámicos y Companion quedan explícitamente fuera.
