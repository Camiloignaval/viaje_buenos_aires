# Exploration: Living Context Weather

## Qué revisar primero

La decisión central es **extender de forma aditiva el resolver existente** de `living-context-foundation`: Weather será un quinto resultado parcial, no otro engine, resolver, registry ni arquitectura genérica de providers. La frase “no modificar Living Context Foundation” debe entenderse como **no rediseñarla**; agregar `weather` al snapshot, capabilities, razones y orquestación del resolver existente requiere cambios localizados en esos contratos. Evitarlos obligaría a crear el segundo resolver que el alcance prohíbe.

## Current State

- `createLivingContextResolution` ya es la única composición de dominio: produce `{ initial, settled }`, resuelve destination/temporal/narrative sin red y aísla financial con un adapter async inyectado y `Promise.allSettled`.
- `LivingTravelContext` y `LivingContextCapabilities` son contratos explícitos y cerrados a cuatro módulos. `LIVING_CONTEXT_MODULES`, razones y umbrales también son catálogos cerrados. Weather debe entrar ahí de forma explícita; un registry dinámico haría menos verificables ownership, reasons y capabilities.
- `contextEngine.ts` contiene un `Map` legacy que registra `FinancialContextModule`, pero el Living Context verificado no lo usa. Convertirlo ahora en otra vía de composición duplicaría la autoridad del resolver. Debe permanecer intacto.
- Provenance/freshness ya viven en `ModuleResult<T>`: `owner`, `source`, `observedAt`, `freshness` y razón cerrada. Weather debe reutilizar el envelope; no debe copiar `source`, `fetchedAt` o `freshness` dentro del valor de dominio. Para Weather, `provenance.observedAt` representa `fetchedAt`; `expiresAt`, `effectiveAt` y `confidence` sí son semántica propia del snapshot.
- El observer ya acepta únicamente módulo, estado, razón cerrada, source categórica y duración; es best-effort. Solo necesita admitir `weather` y categorizar source como `weather.provider|weather.cache|weather.adapter`, nunca payload, error crudo, ids, coordenadas, presupuesto, tokens o PII.
- `useLivingContext` reutiliza TanStack Query para financial y no consulta Trip/Story. Weather puede seguir el mismo patrón de query key/options, pero no debe duplicar ownership ni freshness en React.
- Trip ya es dueño de `destination.latitude`, `destination.longitude` y `destination.timezone`. Son coordenadas de la ciudad elegida, suficientes para Weather. No hace falta geocoding, accommodation, GPS del dispositivo ni geolocalización continua. Usar accommodation sería más preciso de lo necesario y aumentaría el riesgo de privacidad.
- El Health Check existente es puro, local y legacy-safe. Ya acepta contexto runtime opcional, por lo que puede validar un diagnóstico Weather sanitizado sin llamar al proveedor ni exigir Weather a stories anteriores.
- La verificación de Foundation cerró 27/27 escenarios y fijó invariantes que este cambio debe preservar: resultados parciales, reloj inyectado, no mutación, source categórica, cache por identidad remota y ausencia de requests Trip/Story duplicados.

### Selección del proveedor

**Recomendación: Open-Meteo Forecast API detrás de un adapter interno reemplazable.**

- Su documentación oficial acepta WGS84 `latitude`/`longitude`, una timezone IANA explícita y expone current weather, probability of precipitation, WMO weather code, sunrise y sunset; por lo tanto cubre el contrato mínimo sin geocoding ni datos “por si acaso”: [Forecast API](https://open-meteo.com/en/docs).
- Open-Meteo declara que el acceso no comercial no requiere API key: [About](https://open-meteo.com/en/about). Esto evita package/env/config nuevos en esta etapa.
- La alternativa viable, MET Norway Locationforecast, es global y pública, pero exige identificación mediante `User-Agent`, recomienda cache basado en headers y advierte limitaciones para consumo directo desde browser/CORS: [Locationforecast HOWTO](https://api.met.no/doc/locationforecast/HowTO), [Terms](https://api.met.no/doc/TermsOfService). Es técnicamente buena como reemplazo futuro, pero agrega más requisitos operativos para esta prueba.
- Riesgo contractual: la API gratuita de Open-Meteo es solo para uso no comercial, tiene límites y exige atribución CC BY 4.0; producción comercial requeriría plan, self-hosting o cambio de provider: [Terms](https://open-meteo.com/en/terms), [Pricing](https://open-meteo.com/en/pricing). La elección es válida para prototipo/evaluación, **no** constituye aprobación legal para producción.

El JSON de Open-Meteo debe terminar en la capa provider. Alaia solo recibe un `WeatherProviderSnapshot` normalizado y validado. Cambiar a MET Norway, un plan comercial o self-hosting no debe alterar `WeatherContext` ni el resolver.

### Contrato decision-driven recomendado

`ModuleResult<WeatherContext>` conserva status, reason, freshness y provenance. El valor Weather solo incorpora información que habilita una decisión:

```ts
type WeatherCondition =
  | "clear" | "cloudy" | "fog" | "rain"
  | "storm" | "snow" | "freezing" | "unknown";

interface WeatherContext {
  condition: WeatherCondition;
  temperatureC: number;
  precipitationProbability: number | null;
  isRaining: boolean;
  isStorm: boolean;
  isSnow: boolean;
  sunrise: { localDateTime: string; timezone: string } | null;
  sunset: { localDateTime: string; timezone: string } | null;
  effectiveAt: { localDateTime: string; timezone: string };
  expiresAt: string;
  confidence: "unknown";
}
```

`confidence: "unknown"` es deliberado: el endpoint elegido no entrega una confianza comparable para este snapshot y Alaia no debe inventar `high|medium|low`. `effectiveAt`, sunrise y sunset conservan fecha/hora local más timezone; no deben parsearse como UTC implícito. El request debe enviar la timezone IANA del Trip de forma explícita, nunca `auto`, browser, server o device timezone.

La primera entrega debe resolver Weather solo para una ventana temporal accionable acordada en specs (viaje en curso/hoy y, si se decide incluir forecast, días cubiertos explícitamente por el provider). Consultar el clima actual de un viaje lejano o terminado contradice Decision Driven Context. Fuera de ventana se devuelve `weather_outside_window` y no se hace request.

### Cache, freshness y fallas

- Provider/cache backend siguiendo el patrón existente de `app/lib/context/`: timeout, payload acotado, validación estricta, normalización y deduplicación de requests concurrentes.
- Cache de éxitos únicamente, en memoria y desacoplado del adapter, con key por identidad meteorológica normalizada (coordenada de ciudad + timezone + fecha/ventana efectiva). No persistir Weather ni coordenadas en Mongo.
- TTL recomendado inicial: **15 minutos**, alineado con current conditions basadas en datos de 15 minutos según la documentación de Open-Meteo. `fetchedAt` se fija con reloj inyectable al aceptar un payload válido y `expiresAt = fetchedAt + TTL`.
- Una respuesta HTTP fallida, timeout, JSON inválido, timezone incoherente o campos no finitos **no entra al cache**. La promesa in-flight se elimina en `finally`; un intento posterior puede recuperar.
- React Query comparte una sola consulta por identidad y usa el mismo TTL. Una respuesta expirada puede exponerse como `stale` mientras refresca; si el refresh confirma falla, Weather pasa a `unavailable` y el resto del snapshot se conserva. Nunca se presenta una observación vencida como fresh.
- La query key no debe contener coordenadas exactas si puede usar `destination.cityId + timezone + targetDate`; las coordenadas viajan solo al adapter/provider porque son necesarias para resolver clima y nunca al observer.

### Capabilities y decisiones futuras

Runtime agrega solo `capabilities.weather`, derivada de `weather.status === "available"`; no es feature flag. No se deben agregar flags falsos para Companion, Editorial Intelligence, Memory o Story Evolution.

La relación decision-driven se documenta, no se implementa:

- precipitación/tormenta/nieve → planificación indoor/outdoor y reordenamiento futuro de actividades;
- temperatura → recomendaciones futuras de confort/vestimenta;
- sunrise/sunset → timing futuro de recorridos y actividades con luz natural;
- `effectiveAt/freshness/confidence` → decidir si un consumidor futuro puede actuar o debe abstenerse;
- consumidores potenciales: Companion, Editorial Intelligence, Memory y Story Evolution, todos fuera de scope ahora.

El patrón para Holidays, Events, Transit, Electricity y Safety será el mismo: contrato pequeño guiado por decisiones, adapter reemplazable, cache propio, módulo explícito en el resolver, capability derivada, provenance/freshness y falla parcial. “Trivial” significa repetible y localizado, no un registry mágico ni cero cambios contractuales.

## Affected Areas

- `app/src/features/context-engine/livingContext.ts` — sumar Weather al único resolver, a `initial/settled`, observer y capability sin alterar ownership existente.
- `app/src/features/context-engine/types.ts` — ampliar catálogos cerrados de módulo/razones; no crear tipos espejo del provider.
- `app/src/features/context-engine/livingContextConstants.ts` — umbral Weather explícito y verificable.
- `app/src/features/context-engine/weatherContext.ts` — contrato de dominio, WMO→condición y adapter boundary.
- `app/src/features/context-engine/weatherContextClient.ts` — único contacto frontend con endpoint Alaia.
- `app/src/features/context-engine/weatherContextQuery.ts` — query key/options y TTL compartidos.
- `app/src/features/context-engine/useLivingContext.ts` — integrar el resultado Weather sin queries nuevas de Trip/Story ni reglas de dominio duplicadas.
- `app/lib/context/weatherProvider.js` — único conocimiento del JSON Open-Meteo, timeout, tamaño máximo y validación.
- `app/lib/context/weatherCache.js` — success-only cache e in-flight dedupe sin Mongo.
- `app/routes/context/weather.js`, `app/lib/apiRoutes.js` — endpoint autenticado y acotado; no endpoint agregador.
- `app/src/features/story/health/livingContextCheck.ts` — diagnósticos runtime opcionales, puros y sanitizados.
- Tests colocados junto a provider/cache/resolver/query/hook/Health — evidencia de provider, invalid payload, TTL, dedupe, timezone/DST, capabilities y resolución parcial.

## Approaches

1. **Adapter backend Open-Meteo + extensión explícita del resolver existente** — normalizar al provider en backend, cachear éxitos y sumar Weather como quinto módulo parcial.
   - Pros: provider reemplazable; JSON externo no llega al dominio; replica fronteras y cache ya probados; protege auth/timeout/payload; no requiere key ni config nueva; un solo resolver.
   - Cons: agrega route y tests Node además de React; la licencia free no habilita producción comercial.
   - Effort: Medium

2. **Fetch directo desde React** — consultar Open-Meteo desde `weatherContextQuery` y normalizar en frontend.
   - Pros: menos archivos y menor esfuerzo inicial.
   - Cons: expone proveedor/coords al browser, acopla CORS y contrato JSON a frontend, limita cache entre usuarios, debilita reemplazo y repite errores ya resueltos por el patrón financiero.
   - Effort: Low

3. **Registry/plugin genérico para providers dinámicos** — convertir el `Map` legacy o crear metadata común para cargar Weather y futuros módulos.
   - Pros: aparente reducción de líneas al agregar nombres nuevos.
   - Cons: viola el alcance, crea una segunda autoridad de composición, oculta contratos/capabilities/reasons y anticipa abstracción antes de tener dos casos homogéneos.
   - Effort: High

## Recommendation

Adoptar el enfoque 1. Weather debe ser un slice aditivo del Living Context actual: provider backend reemplazable, cache success-only, adapter inyectado, resultado parcial y consumo React por la cache existente. No usar el registry legacy ni extraer todavía una plataforma genérica de providers. Congelar en proposal/spec la ventana temporal accionable y los reason codes antes del diseño; es la decisión funcional que más afecta contrato y query identity.

### Qué NO implementar

- IA, Companion, chatbot, decisiones automáticas, Editorial Intelligence, Memory o Story Evolution funcionales.
- UI, pantallas, copy narrativo, notificaciones, geofencing o geolocalización continua.
- Holidays, Events, Transit, Electricity o Safety, ni placeholders/capabilities para ellos.
- Geocoding nuevo, GPS, accommodation como coordenada Weather o timezone `auto`.
- Segundo Context Engine, segundo resolver, segundo registry, registry genérico, endpoint agregador o reimplementación de destination/temporal/financial/narrative.
- Persistencia Weather/Mongo, cache de errores/payload inválido, raw provider JSON en frontend, nueva dependencia, env/config o feature flag.
- Build, Playwright sin UI, push, tags o archive de OpenSpec.

## Risks

- La licencia free de Open-Meteo no sirve para producción comercial; debe existir un gate de licencia/atribución antes del rollout, aunque el adapter reduce el costo de cambio.
- El alcance debe fijar la ventana Weather accionable; sin eso se corre el riesgo de consultar datos actuales irrelevantes para viajes lejanos.
- `useLivingContext` hoy adapta financial fuera del `settled` del resolver. Copiar ese patrón sin cuidado duplicaría freshness/observer; Weather necesita una sola función de mapeo compartida y testeada.
- Query keys con coordenadas exactas pueden filtrarse a tooling/logs. Preferir identidad de ciudad/timezone/fecha y mantener coordenadas solo en el closure/transport necesario.
- Open-Meteo devuelve horas locales cuando se pasa timezone; parsearlas como UTC introduciría errores DST. El contrato debe conservar timezone junto al local datetime.
- TanStack Query conserva el último dato exitoso durante un refetch fallido. El hook debe respetar `expiresAt` y degradar a unavailable tras falla confirmada, no presentar stale como fresh.
- Agregar Weather amplía los catálogos cerrados y toca el resolver; eso es extensión contractual inevitable, no un rediseño. Declarar “cero cambios a Foundation” sería técnicamente falso.

## Ready for Proposal

**Yes.** La arquitectura existente soporta el primer provider real sin otro engine/resolver/registry. El proposal debe fijar: Open-Meteo como provider inicial evaluativo, adapter backend reemplazable, TTL de 15 minutos, ventana temporal accionable, contrato normalizado, reasons cerradas, capability derivada, Health runtime no crítico y todos los límites negativos anteriores.
