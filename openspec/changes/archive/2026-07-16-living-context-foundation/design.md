# Design: Living Context Foundation

## Qué revisar primero

La frontera es `app/src/features/context-engine/`: un resolver de dominio único produce un snapshot parcial; React, Health Check y futuros adapters consumen ese contrato. No se agrega endpoint, backend, proveedor ni segundo engine.

## Enfoque técnico

`createLivingContextResolution(input, deps)` será puro respecto de globals: no importará React, `window`, `fetch` ni storage; recibirá reloj, adapter financiero y observador. Resolverá destination, temporal y narrative de inmediato y devolverá `{ initial, settled }`: `initial` expone el contexto base sin bloquear y `settled` incorpora adapters async mediante `Promise.allSettled`, aislando fallas.

```text
Trip/User/Story snapshots ──> resolver puro ──> initial
                                  │
                                  └─ adapters async/cache ──> settled
                                           │
                                      observer seguro
```

## Decisiones de arquitectura

### Contrato pequeño, estable y trazable

`LivingTravelContext` tendrá `resolvedAt`, cuatro envelopes nominales (`destination`, `temporal`, `financial`, `narrative`) y `capabilities` derivadas. Cada `ModuleResult<T>` contiene `status: "available" | "unavailable"`, `value`, `reason`, `freshness: "fresh" | "stale" | "unavailable"` y `provenance { owner, source, observedAt }`. `observedAt` describe la observación disponible (timestamp de cache/query/Trip); no se inventa un timestamp de proveedor. `resolvedAt` usa el reloj inyectado.

Las capabilities se calculan desde resultados utilizables; no son flags configurables. Solo existen los cuatro módulos implementados. Una extensión futura agrega tipo, adapter real y tests en un slice; nunca registra módulos `null`, placeholders ni nombres en el `Map` legacy.

### Ownership y precedencia

- **Destination:** `Trip.destination` estructurado manda; Story solo completa metadata curada no factual y `localeCatalog`/`currencyCatalog` son fallback. Un destino legacy no gana precisión inventada.
- **Temporal:** fechas y timezone del Trip alimentan `safeTripTemporalState`; Story no reemplaza el calendario real. Timezone inválida degrada solo temporal.
- **Financial:** User define moneda preferida; la moneda de `Trip.travelBudget` no se interpreta como moneda local. Un adapter envuelve `FinancialContextModule` y conserva `source`, `fetchedAt` y stale cuando existan.
- **Narrative:** Story es dueña de mood, copy e Intelligence literales; `StoryView` aporta capítulo actual. Se preservan `baseStoryId` (catálogo consultado) y `storyId` (package), sin equipararlos. El snapshot Story solo se acepta si fue cargado para el `baseStoryId` vigente del Trip.

### Observabilidad segura

El callback inyectable recibe únicamente módulo, status, razón sanitizada, source categórica y duración. Nunca recibe ids de usuario/viaje, nombres, email, copy, presupuesto/montos, tokens, errores crudos ni coordenadas exactas. Si el observer falla, no altera el resultado.

## Integración React y cache

`useLivingContext` recibirá Trip/User/Story ya cargados y sus `dataUpdatedAt`; no ejecutará queries de Trip o Story. Se extraerán `financialContextQueryKey/options` para que `useFinancialContext` y el adapter usen exactamente `['context-engine','financial',…]` en el QueryClient único. Dos consumidores comparten la promesa/cache; cambios locales recalculan base sin request. El hook publica `initial` en el primer render y reemplaza solo módulos resueltos al completar `settled`.

## Health Check

Un checker incremental valida solo metadata local verificable: país/locale/moneda resolubles, ids narrativos cuando el caller aporta `baseStoryId`, y coherencia destination/timezone cuando existe contexto suficiente. Emite códigos/path estables `info|warning`, nunca valores sensibles ni `critical` por metadata nueva ausente. Stories legacy siguen válidas; clima, eventos, transporte y alertas inexistentes no generan hallazgos.

## Archivos previstos

| Path | Acción |
|---|---|
| `app/src/features/context-engine/livingContext.ts` | Crear contrato, precedence, capabilities y resolución parcial |
| `app/src/features/context-engine/{destination,temporal,narrative,financial}Context.ts` | Crear módulos/adapters concretos |
| `app/src/features/context-engine/financialContextModule.ts` | Preservar provenance disponible |
| `app/src/features/context-engine/financialContextQuery.ts` | Compartir key/options de cache |
| `app/src/features/context-engine/useLivingContext.ts` | Crear hook delgado |
| `app/src/features/story/health/livingContextCheck.ts` | Crear checker incremental |
| `app/src/features/story/health/{healthCheck,types}.ts` | Integrar contexto opcional sin romper legacy |
| `app/src/features/trips/lib/countdown.ts` | Reutilizar sin cambiar copy ni semántica |

## Estrategia Strict TDD

1. **RED:** tests colocados para precedence/no mutación/ids, timezone-DST, freshness/provenance, literalidad, falla aislada y entrega `initial` antes de finance.
2. **GREEN:** implementar por slices autónomos: contrato+módulos; async+cache/hook; Health Check.
3. **REFACTOR:** eliminar duplicación conservando keys y API pública; ejecutar tests Vitest focalizados y luego `npm run test:react`. Nunca build.

No hay migración, rollout backend ni UI. Reconciliación con specs paralelas: cubierta; al implementar debe fijarse el catálogo exacto de razones y umbrales de freshness antes de congelar el contrato.
