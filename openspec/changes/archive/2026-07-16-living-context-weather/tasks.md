# Tasks: Living Context Weather

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900–1,300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Slice 1 backend → Slice 2 domain → Slice 3 React/Health |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Local review slice | Notes |
|---|---|---|---|
| 1 | Provider, cache y route | `feat(context): add weather provider adapter` | Base conceptual: tracker; tests incluidos |
| 2 | Dominio y resolver | `feat(context): resolve weather context` | Base conceptual: slice 1 |
| 3 | React y Health | `feat(context): integrate weather query and health` | Base conceptual: slice 2 |

Las slices son commits temáticos locales sobre `etapa-7-living-context`; no crear ni publicar ramas/PRs.

## Phase 1: Backend adapter (RED → GREEN → REFACTOR)

- [x] 1.1 **RED:** En `app/lib/context/`, crear `weatherProvider.test.js` y `weatherCache.test.js`; crear `app/routes/context/weather.test.js` y ampliar `app/lib/apiRoutes.test.js`; evidenciar: **Respuesta normalizada**, **Proveedor exitoso**, **Respuesta inválida o timeout**, **TTL y concurrencia**, **Falla no cacheada**, **Sustitución del proveedor**; cubrir auth/CORS/método/body, 64 KiB, timeout, no-store y key sin coordenadas.
- [x] 1.2 **GREEN:** En `app/lib/context/`, crear `weatherProvider.js` y `weatherCache.js`; crear `app/routes/context/weather.js` y registrar en `app/lib/apiRoutes.js`: normalización estricta, reloj inyectable, TTL 15 min, SHA-256 server-only, success-only e in-flight deduplicado.
- [x] 1.3 **REFACTOR:** Eliminar duplicación sin abstraer providers futuros; ejecutar tests Node focales y completos; conservar provider errors tipados/sanitizados.

## Phase 2: Domain resolver (RED → GREEN → REFACTOR)

- [x] 2.1 **RED:** En `app/src/features/context-engine/`, crear `weatherContext.test.ts`, `weatherContextClient.test.ts` y ampliar `livingContext.test.ts`; evidenciar: **Dentro de ventana con cruce DST**, **Fuera de ventana**, **Dato vence**, **Falla aislada**, **Contexto completo con Weather**, **Weather falla**, **Adapter financiero falla**, **Inputs mínimos**, **Snapshot envejecido**, **Falla Weather observada de forma segura**, **Cambio DST**, **Ownership Weather**, **Narrativa literal**, **Dependencia Weather no configurada**.
- [x] 2.2 **GREEN:** En `app/src/features/context-engine/`, crear `weatherContext.ts`, `weatherContextClient.ts`; modificar `types.ts`, `livingContextConstants.ts`, `livingContextResult.ts`, `livingContext.ts`: quinto módulo pending/settled, reasons, provenance/freshness, capability por status y observer categórico.
- [x] 2.3 **REFACTOR:** Mantener Trip ownership, `{ initial, settled }` y Foundation intactos; ejecutar tests React focales y typecheck.

## Phase 3: React y Health (RED → GREEN → REFACTOR)

- [x] 3.1 **RED:** En `app/src/features/context-engine/`, crear `weatherContextQuery.test.ts` y ampliar `useLivingContext.test.tsx`; ampliar `app/src/features/story/health/livingContextCheck.test.ts`; evidenciar: **Dos consumidores elegibles**, **Trip no elegible**, **Weather pendiente o fallido**, **Módulo futuro no soportado**, **Weather soportado sin UI**, **Story legacy sin Weather**, **Timezone inválida**, **Respuesta runtime inválida**, **Provider saludable**, **Valor sensible inválido**, **Proveedor no configurado**.
- [x] 3.2 **GREEN:** Crear `app/src/features/context-engine/weatherContextQuery.ts`; modificar `app/src/features/context-engine/useLivingContext.ts`, `app/src/features/story/health/types.ts` y `livingContextCheck.ts`: query compartida sin coordenadas en key, retry false, refresh-failure seguro y diagnósticos opcionales sin requests.
- [x] 3.3 **REFACTOR:** Ejecutar suites Node/React, typecheck y `git diff --check`; confirmar 31/31 escenarios con evidencia. No ejecutar build, archive, push ni tocar UI/config.

## Archive guard

- [x] 4.1 Mantener activos y sin archive `living-context-foundation` y `living-context-weather`; Weather depende de las specs Foundation aún activas.

## Apply Progress

### Slice 1 — Backend adapter

- Estado: completo; frontera autónoma `provider + cache + auth route`.
- Tests focales: `node --test lib/context/weatherProvider.test.js lib/context/weatherCache.test.js routes/context/weather.test.js lib/apiRoutes.test.js` — 27/27.
- Suite Node: `npm.cmd test` — 233/233.
- Build/React: no ejecutados; fuera de alcance de esta slice.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `weatherProvider.test.js`, `weatherCache.test.js`, `weather.test.js`, `apiRoutes.test.js` | Unit + route integration | 14/14 provider/cache existentes | 4 archivos fallaron por módulos/ruta ausentes | 27/27 focales | Happy paths + payload/timeout/TTL/concurrencia/auth/errores | 27/27 tras limpieza |
| 1.2 | mismos archivos | Unit + route integration | N/A (producción nueva) | Contratos escritos antes de producción | 27/27 focales | Provider alternativo, WMO nieve y TTL boundary | Validator de input compartido |
| 1.3 | mismos archivos | Unit + route integration | 27/27 focales | Input inválido y error de lectura fallaron antes del refactor | 27/27 focales | Input inválido no ejecuta fetch + auth real | 233/233 suite Node |

### Test Summary

- Tests nuevos ejecutados: 27.
- Capas: unitarias y route integration; sin E2E.
- Approval tests: ninguna; no se refactorizó comportamiento legacy.
- Funciones puras creadas: validación de input/snapshot, normalización WMO y cache identity SHA-256.

### Slice 2 — Domain resolver

- Estado: completo; frontera autónoma `Weather domain + client contract + fifth resolver module`.
- Tests focales: `npm.cmd run test:react -- src/features/context-engine/weatherContext.test.ts src/features/context-engine/weatherContextClient.test.ts src/features/context-engine/livingContext.test.ts` — 21/21.
- Safety net Context Engine: `npm.cmd run test:react -- src/features/context-engine` — 115/115.
- Typecheck: `npm.cmd run typecheck` — PASS.
- Build/Node/E2E: no ejecutados; fuera del alcance de esta slice.

### TDD Cycle Evidence — Slice 2

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 | `weatherContext.test.ts`, `weatherContextClient.test.ts`, `livingContext.test.ts` | Unit + resolver integration | 8/8 `livingContext` baseline | Imports y quinto módulo ausentes; 4 fallas + 2 suites sin resolver | 19/19 iniciales | DST inicio/fin, fuera de ventana, missing/range, fresh/stale, HTTP/runtime/network | 21/21 focales |
| 2.2 | mismos archivos | Unit + resolver integration | N/A (contratos Weather nuevos) | Contratos y escenarios escritos antes de producción | 19/19 tras mínimo dominio/resolver | Snapshot runtime inválido y timezone/fecha contradictorias | Validator cerrado y source categórico; 21/21 |
| 2.3 | mismos + `useLivingContext.test.tsx` | Regression | 113 tests Context Engine, 1 expectativa legacy detectada | Source fuera de ventana y coordenada fuera de rango fallaron antes del ajuste | 21/21 focales | Foundation con falla financiera/Weather independientes | 115/115 safety net + typecheck PASS |

### Test Summary — Slice 2

- Tests focales ejecutados: 21; safety net Context Engine: 115.
- Capas: unitarias y resolver/client integration; sin E2E.
- Approval tests: 8 tests baseline del resolver antes de modificarlo.
- Funciones puras creadas: elegibilidad local DST-safe, validación cerrada de snapshot y mapeo snapshot→ModuleResult.

### Slice 3 — React Query and Health

- Estado: completo; frontera autónoma `shared Weather query + hook composition + optional local Health diagnostics`.
- Safety net: `useLivingContext.test.tsx` + `livingContextCheck.test.ts` — 14/14 antes de editar.
- RED inicial: suite Query sin módulo; 2 fallas Hook y 2 fallas Health. RED de triangulación: error crudo del cliente no se categorizaba.
- GREEN/REFACTOR focal: `weatherContextQuery`, `useLivingContext`, `livingContextCheck` — 23/23.
- Focal Weather/Context/Health: 44/44; Node focal explícito: 27/27; Node completo: 233/233; React completo: 592/592.
- Typecheck y `git diff --check`: PASS. Build, Playwright, archive, push y tags: no ejecutados.
- Evidencia SDD: 31/31 escenarios mapeados a tests runtime; Foundation y Weather permanecen activos y sin archive.

### TDD Cycle Evidence — Slice 3

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `weatherContextQuery.test.ts`, `useLivingContext.test.tsx`, `livingContextCheck.test.ts` | Unit + React integration | 14/14 Hook + Health | Query ausente; 4 comportamientos Hook/Health fallaron | 23/23 focales | eligible/ineligible, pending/available/refresh-failed, configured/unconfigured/invalid | 44/44 Weather/Context/Health |
| 3.2 | mismos archivos | Unit + React integration | N/A (query nueva; contratos Health opcionales) | Contratos escritos antes de producción | 23/23 focales | null y rechazo crudo producen el mismo error sanitizado; dato retenido falla cerrado | Query key sanitizada y diagnósticos categóricos |
| 3.3 | suites focales y completas | Regression | 44/44 focales | Rechazo crudo expuso el mensaje antes del catch categórico | 27/27 Node focal, 233/233 Node, 592/592 React | 31 escenarios SDD completos | Typecheck + diff check PASS |

### Test Summary — Slice 3

- Tests agregados: 9 casos (`weatherContextQuery`: 3; Hook: 3; Health: 3), con múltiples caminos triangulados.
- Capas: unitarias y React Query/Hook integration; sin E2E ni UI.
- Approval tests: 14 tests baseline de Hook + Health antes de modificar comportamiento.
- Funciones puras reutilizadas: elegibilidad Weather y resolución de snapshot; Health permanece puro/local y la query no duplica reglas de dominio.
