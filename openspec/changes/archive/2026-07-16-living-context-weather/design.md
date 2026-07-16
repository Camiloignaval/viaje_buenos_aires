# Design: Living Context Weather

## Qué revisar primero

Weather extiende `createLivingContextResolution`; no usa el `Map` legacy de `contextEngine.ts`. Open-Meteo termina en `app/lib/context/weatherProvider.js`: dominio, React y Health solo conocen contratos normalizados.

## Enfoque técnico

`weatherContext.ts` concentra contrato, elegibilidad y mapeo a `ModuleResult`. Un Trip es elegible solo si `status === "active"`, su estado temporal es `today` o `in-progress`, y `targetLocalDate` coincide con hoy calculado mediante la timezone IANA del destino. Coordenadas, timezone y fechas son exclusivamente Trip-owned. El resolver publica Weather `pending` en `initial` y lo incorpora por `Promise.allSettled` en `settled`; cualquier falla preserva Foundation.

```text
Trip + reloj -> elegibilidad local -> resolver initial
                         | elegible
React Query -> POST autenticado -> cache 15m -> provider/normalizer Open-Meteo
                         |
             snapshot normalizado -> resolver settled/capability/observer
```

## Decisiones de arquitectura

| Decisión | Alternativa descartada | Rationale |
|---|---|---|
| Quinto módulo explícito en el resolver | Segundo resolver o registry genérico | Mantiene una autoridad y contratos/reasons verificables. |
| `POST /api/context/weather` con body validado | Fetch browser o coordenadas en URL/query key | Conserva auth y evita coordenadas precisas en tooling y access URLs. |
| Cache server-only success-only | Mongo o stale fallback backend | Weather vencido no es una verdad durable; una falla debe poder reintentarse. |
| Hora local + timezone sin convertir a UTC implícito | `timezone=auto`/reloj del host | Evita corrimientos de día y DST. |
| Provider concreto reemplazable | Plataforma genérica anticipada | Un reemplazo solo cambia provider/normalizer y sus tests; endpoint y consumidores quedan estables. |

## Contratos y razones

```ts
interface WeatherContext {
  condition: "clear"|"cloudy"|"fog"|"rain"|"storm"|"snow"|"freezing"|"unknown";
  temperatureC: number; precipitationProbability: number|null;
  isRaining: boolean; isStorm: boolean; isSnow: boolean;
  sunrise: LocalDateTime|null; sunset: LocalDateTime|null;
  effectiveAt: LocalDateTime; expiresAt: string; confidence: "unknown";
}
interface LocalDateTime { localDateTime: string; timezone: string }
interface WeatherAdapterSnapshot { value: WeatherContext; fetchedAt: string; source: string }
```

`LivingContextReason` agrega `missing_weather_input`, `weather_outside_window`, `weather_pending`, `weather_failed`, `weather_refresh_failed`; `weather` se agrega a módulos, TTL/freshness (900000 ms), snapshot y capabilities. `observedAt=fetchedAt`; `expiresAt` manda sobre freshness y `categoricalWeatherSource` limita source a `weather.provider|weather.cache|weather.adapter`. `capabilities.weather` deriva solo de status.

## Backend, cache y React

La route rechaza todo salvo `POST`, aplica CORS, `requireUser`, y valida body exacto: lat/lon finitos y en rango, timezone IANA válida y `localDate` `YYYY-MM-DD`. Responde solo snapshot normalizado y `Cache-Control: private, no-store`.

El provider usa timeout 5 s, respuesta máxima 64 KiB y valida HTTP, JSON, timezone, unidades, WMO/current/daily, números finitos y fecha local. Mapea WMO y campos incidentales dentro de infraestructura; fija `fetchedAt` con reloj inyectado y `expiresAt=+15m`. El cache usa una clave SHA-256 server-only de coordenadas normalizadas+timezone+fecha; guarda solo éxitos y elimina in-flight en `finally`.

React Query usa `['context-engine','weather',cityId,timezone,localDate]`; coordenadas viven solo en el closure/body. `enabled` reutiliza la elegibilidad pura, `staleTime=15m`, `retry=false`. Dato expirado durante refetch se expone `stale`, nunca `fresh`; si el refetch falla (`isRefetchError`), el resolver descarta el valor retenido y devuelve `weather_refresh_failed`, `value:null`, capability false. Sin dato: pending/error son deterministas.

## Archivos y pruebas

- Crear `weatherContext{,.test}.ts`, `weatherContextClient{,.test}.ts`, `weatherContextQuery{,.test}.ts`; modificar `types.ts`, `livingContextConstants.ts`, `livingContextResult.ts`, `livingContext{,.test}.ts`, `useLivingContext{,.test}.tsx`.
- Crear `app/lib/context/weatherProvider{,.test}.js`, `weatherCache{,.test}.js`, `app/routes/context/weather{,.test}.js` y `app/lib/apiRoutes.test.js`; modificar `app/lib/apiRoutes.js`.
- Ampliar opcionalmente `story/health/{types,livingContextCheck,livingContextCheck.test}.ts` solo con `providerStatus`/`snapshotStatus` categóricos; ausencia legacy no genera critical y nunca hay payload/request.

Strict TDD por slices revisables: backend; dominio/resolver; React/Health. Probar DST/ownership, payload/timeout/tamaño, TTL boundary/dedupe/no-cache-error, partialidad, observer sin secretos, refetch fallido con dato retenido y provider alternativo.

## Migración / rollout

Sin migración, flags, config, dependencias, UI ni persistencia. Open-Meteo requiere gate legal antes de uso comercial. No hay preguntas abiertas.
