# Verification Report: Living Context Foundation

**Change**: `living-context-foundation`
**Version**: N/A
**Mode**: Strict TDD
**Artifact store**: OpenSpec
**Base / rango auditado**: `2d65d66..844f106` (`a6ee49d`, `a55fa57`, `b7e7750`, `844f106`)
**Fecha**: 2026-07-15
**Verdict**: **FAIL**

La implementación compila y las suites actuales pasan, pero no supera el gate SDD: 5 de 27 escenarios no tienen una prueba runtime que los cubra, y la inspección estática encontró incumplimientos funcionales en freshness, memoización React, reutilización de cache, ownership de moneda y sanitización del observer.

## Completeness

| Metric | Value |
|---|---:|
| Tasks total | 13 |
| Tasks complete | 13 |
| Tasks incomplete | 0 |
| Commits temáticos | 4 |
| Archivos cambiados | 35 |
| Inserciones / eliminaciones | 1490 / 26 |
| Líneas cambiadas | 1516 |

`tasks.md` declara 13/13 tareas completas. Esto prueba cierre del apply, no compliance: verify prevalece sobre los checkboxes.

## Build & Tests Execution

| Comando | Resultado | Evidencia exacta |
|---|---|---|
| `npm.cmd run test:react -- <8 archivos focales>` | ✅ PASS | 8 files, 23 tests passed, 0 failed |
| `npm.cmd test` | ✅ PASS | 218 tests passed, 0 failed, 0 skipped |
| `npm.cmd run test:react` | ✅ PASS | 90 files, 561 tests passed, 0 failed |
| `npm.cmd run typecheck` | ✅ PASS | `tsc -p tsconfig.json --noEmit`, exit 0 |
| `git -c safe.directory=... diff --check 2d65d66..844f106` | ✅ PASS | exit 0, sin errores de whitespace |
| `npm run build` | **NO EJECUTADO** | Restricción absoluta de `AGENTS.md`: nunca ejecutar build después de cambios |
| Playwright | ➖ No aplicable | No se agregó UI visible ni flujo E2E; solo dominio, hooks/cache, tipos y Health Check |

El primer intento focal con `npm` falló antes de ejecutar tests porque PowerShell bloqueó `npm.ps1`; se repitió de forma equivalente con `npm.cmd` y pasó. No es una falla del producto.

**Coverage**: omitido — no están instalados `@vitest/coverage-v8` ni `@vitest/coverage-istanbul`.
**Linter**: no disponible — no existe script/binario ESLint.
**Type checker**: ✅ sin errores.

## Spec Compliance Matrix

### `living-context-resolution` — 10 escenarios

| Requirement | Scenario | Runtime evidence | Result |
|---|---|---|---|
| Ownership y precedencia | Fuentes concordantes | `livingContext.test.ts > mantiene precedencia...`; `destinationContext.test.ts > Trip estructurado...` | ⚠️ PARTIAL — no se prueba owner/source por campo y el contrato solo expone provenance por módulo |
| Ownership y precedencia | Story contradice al Trip | `livingContext.test.ts > mantiene precedencia...` usa destino/fechas contradictorios y conserva Trip | ✅ COMPLIANT |
| Resolución parcial | Contexto completo | Ninguna prueba resuelve simultáneamente destination, temporal, financial y narrative como `available` | ❌ UNTESTED |
| Resolución parcial | Adapter financiero falla | `livingContext.test.ts > publica initial... y aísla una falla` | ✅ COMPLIANT |
| Resolución parcial | Inputs mínimos | `livingContext.test.ts > degrada cada módulo...` | ✅ COMPLIANT |
| Freshness/provenance | Snapshot envejecido | No hay prueba que avance el reloj inyectado más allá del umbral y espere `stale` | ❌ UNTESTED |
| Freshness/observabilidad | Falla observada de forma segura | `livingContext.test.ts > publica initial...` verifica que el error sensible no llegue al observer | ✅ COMPLIANT |
| Semántica módulos | Cambio DST | `temporalContext.test.ts > clasifica por día local...` | ✅ COMPLIANT |
| Semántica módulos | Narrativa literal | `narrativeContext.test.ts > preserva literalmente...` | ✅ COMPLIANT |
| Límites | Dependencia futura no configurada | `livingContext.test.ts > degrada cada módulo...` resuelve sin adapter/proveedor y conserva snapshot parcial | ✅ COMPLIANT |

### `living-context-react-integration` — 8 escenarios

| Requirement | Scenario | Runtime evidence | Result |
|---|---|---|---|
| Adaptación | Todos los datos disponibles | Ninguna prueba del hook entrega Trip + User + Story + financial disponibles a la vez | ❌ UNTESTED |
| Adaptación | Datos llegan en renders sucesivos | `useLivingContext.test.tsx > entrega base inmediata y suma Story...` | ✅ COMPLIANT |
| No bloqueo | Finanzas lentas | El resolver puro prueba un Promise pendiente, pero no existe prueba runtime del consumidor React con query financiera pendiente | ❌ UNTESTED |
| No bloqueo | Story falla | La prueba usa `story: null`; no representa ni distingue una query Story fallida | ⚠️ PARTIAL |
| Cache | Dos consumidores simultáneos | `useLivingContext.test.tsx > dos consumidores comparten un request...` | ✅ COMPLIANT |
| Cache | Re-render sin cambio de identidad | La misma prueba confirma 1 request tras rerender ajeno | ✅ COMPLIANT |
| Cache | Cambio de identidad | `useLivingContext.test.tsx > un cambio de Trip...` conserva cache ajena, pero desactiva finanzas y no prueba qué recursos remotos se consultan | ⚠️ PARTIAL |
| Límites | Módulo futuro no soportado | No existe prueba que componga una capability externa sin adapter y pruebe ausencia de UI/request implícito | ❌ UNTESTED |

### `living-context-health` — 9 escenarios

| Requirement | Scenario | Runtime evidence | Result |
|---|---|---|---|
| Legacy | Story legacy válida | `livingContextCheck.test.ts > una Story legacy...` | ✅ COMPLIANT |
| Legacy | Metadata parcial opcional | `livingContextCheck.test.ts > metadata declarada pero parcial...` | ✅ COMPLIANT |
| Metadata incompleta | Campo curado vacío | La prueba confirma warning/código/path, pero no comprueba explícitamente que el package no fue mutado | ⚠️ PARTIAL |
| Metadata incompleta | Metadata completa | `livingContextCheck.test.ts > metadata completa no exige...` | ✅ COMPLIANT |
| Coherencia | Identificadores narrativos incoherentes | `livingContextCheck.test.ts > detecta el baseStoryId...` prueba ambos paths de identidad externa | ✅ COMPLIANT |
| Coherencia | Destino y timezone incoherentes | `livingContextCheck.test.ts > advierte incoherencia...` | ✅ COMPLIANT |
| Coherencia | Dato dinámico ausente | `livingContextCheck.test.ts > metadata completa no exige clima...` | ✅ COMPLIANT |
| Salida segura | Valor sensible inválido | `livingContextCheck.test.ts > advierte incoherencia... y omite valores sensibles` | ✅ COMPLIANT |
| Límites | Proveedor no configurado | `livingContextCheck.test.ts > metadata completa...` ejecuta el checker local sin provider ni requests | ✅ COMPLIANT |

**Compliance summary**: **18/27 COMPLIANT**, **4/27 PARTIAL**, **5/27 UNTESTED**.
Por regla Strict TDD, todo escenario sin prueba runtime es CRITICAL; el resultado no puede ser PASS.

## TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD Evidence reported | ✅ | Tabla presente en Engram #883, 13/13 task rows |
| All behavioral tasks have tests | ✅ | 12/12; 1.1 es estructural/docs-only |
| RED confirmed (test files exist) | ✅ | 8/8 archivos de prueba declarados existen |
| GREEN confirmed | ✅ | 23/23 focales; 561/561 React; 218/218 Node |
| Triangulation adequate | ❌ | 5 escenarios sin coverage runtime y 4 parciales |
| Safety net for modified files | ✅ | #883 registra focales/full suites antes del cierre; suites actuales reejecutadas en verde |

**TDD Compliance**: 5/6 checks passed. La tabla de #883 usa `Observed`, `N/A refactor` o `Skipped` en varias filas RED; es trazabilidad aceptable para tareas GREEN/REFACTOR compartidas, pero NO reemplaza los escenarios faltantes.

## Test Layer Distribution

| Layer | Tests | Files | Tools |
|---|---:|---:|---|
| Unit | 20 | 7 | Vitest |
| Integration React | 3 | 1 | Vitest + Testing Library + TanStack Query |
| E2E | 0 | 0 | Playwright instalado, no aplicable a este cambio sin UI |
| **Total focal** | **23** | **8** | |

## Changed File Coverage

Coverage analysis skipped — no coverage provider is installed. Esto es informativo y no bloquea por sí mismo.

## Assertion Quality

✅ No se encontraron tautologías, ghost loops, asserts sin producción, smoke-only, asserts de CSS ni archivos mock-heavy en los 8 test files del cambio.

## Correctness and Scope Guard

| Check | Status | Evidence |
|---|---|---|
| Un solo Context Engine | ✅ | Todo el dominio nuevo vive en `app/src/features/context-engine/`; no se creó registry/engine paralelo |
| Backend/endpoint/Vercel Function/Mongo/config nuevos | ✅ | Ningún archivo backend/API/Mongo/package/env cambió; solo `.gitignore` agrega `.atl/` |
| IA / Companion funcional / notificaciones | ✅ | No hay imports, archivos ni conducta nueva de esas capacidades |
| Providers dinámicos | ✅ | Solo adapter financiero inyectable/existente; no provider real nuevo |
| UI nueva / copy Etapa 6 | ✅ | No se agregaron componentes/pantallas/copy visible |
| Requests Trip/Story duplicadas | ✅ estático | `useLivingContext.ts` no importa ni ejecuta `getTrip`, `getStory`, `useConnectedTrip` o `useStoryContent`; hooks conectados solo exponen `dataUpdatedAt` |
| Falla financiera parcial | ✅ | El test focal conserva destination y capabilities del resto ante rechazo |
| Ownership / provenance / freshness honestas | ❌ | Ver CRITICAL C2, C4 y C5 |
| Health legacy-safe / sin PII | ✅ para casos probados | 6 tests pasan; mensajes/códigos/paths no interpolan valores sensibles |
| Cambios ajenos preservados | ✅ | `PushCompanion.tsx`, docs y assets untracked permanecen sin tocar |

## Design Coherence

| Decision | Followed? | Notes |
|---|---|---|
| Resolver puro con `{ initial, settled }` | ⚠️ | Resultado de dominio aislado, pero usa `Date.now()` global para duración |
| Cuatro módulos cerrados | ✅ | destination, temporal, financial, narrative |
| `baseStoryId` distinto de `storyId` | ✅ | Contrato y tests los preservan literalmente |
| `safeTripTemporalState` reutilizado | ✅ | No se duplicó lógica temporal |
| Query options financieras compartidas | ✅ | `useFinancialContext` y `useLivingContext` usan el mismo factory |
| Cache por identidad remota, no por dato local | ❌ | La key incluye `localMoney.amount` |
| React adapta todo input actual | ❌ | `useMemo` omite fechas, timezone, view, copy y varios `observedAt` |
| Freshness calculada con reloj inyectado | ❌ | financial fuerza override `fresh` cuando el adapter dice fresh |
| Observer categórico y sin PII | ❌ | `source` del adapter se reenvía sin allowlist/sanitización |

## Issues Found

### CRITICAL

#### C1 — 5 escenarios `UNTESTED`

Faltan pruebas runtime para: contexto completo, snapshot envejecido por reloj, hook React con todos los datos, finanzas lentas en React y capability futura no soportada. Strict TDD exige que cada escenario tenga una prueba ejecutada; evidencia actual: 23/23 focales pasan, pero no ejercitan esos paths.

#### C2 — El hook puede devolver contexto obsoleto ante cambios reales de inputs

`app/src/features/context-engine/useLivingContext.ts:32-41` memoiza el contexto base con una identidad que omite, entre otros, `startDateTime`, `endDateTime`, timezone/country/cityName, `story.view`, mood/copy, `observedAt.trip` y `observedAt.financial`. Un rerender con el mismo `trip.id/updatedAt` pero nuevas fechas, timezone, capítulo visible o timestamps conserva el snapshot anterior. Esto viola “datos disponibles en el render actual” y la adaptación sucesiva.

**Evidencia requerida para nuevo apply**: prueba de rerender por cada familia omitida (temporal, destination, narrative view y provenance) que primero falle y luego demuestre actualización sin request.

#### C3 — Cambiar un monto local crea otra query/request remoto

`app/src/features/context-engine/financialContextQuery.ts:5-14` incluye `localMoney.amount` en la query key y ejecuta la conversión completa en el queryFn. Cambiar solo el monto genera una identidad de cache nueva y puede llamar nuevamente al endpoint de tasas, aunque el recurso remoto base/quote sea el mismo. Viola “recalcular por cambios locales MUST NOT iniciar fetching” y la reutilización por identidad de recurso.

**Evidencia requerida**: test con mismo par ARS/CLP, cambio de 1000 a 2000 y contador de requests que permanezca en 1 mientras cambia el valor convertido.

#### C4 — Freshness financiera no se calcula honestamente con el reloj

`app/src/features/context-engine/livingContext.ts:162-170` y `useLivingContext.ts:47` pasan override `fresh` siempre que el adapter no diga `stale`. Ese override evita que `availableResult` compare un `fetchedAt` antiguo contra `LIVING_CONTEXT_FRESHNESS_MS.financial`. Un snapshot viejo marcado erróneamente `fresh` por el adapter queda fresh para siempre, contrariamente al contrato del reloj inyectado.

**Evidencia requerida**: adapter con `freshness: "fresh"`, `fetchedAt` anterior a 1h y reloj posterior; resolver y hook deben producir `stale` preservando source/fetchedAt.

#### C5 — Story puede sobreescribir la moneda factual del destino Trip/catálogo

`app/src/features/context-engine/destinationContext.ts:18-20` pasa `story.budget.currency` como `localCurrency`. El test `destinationContext.test.ts:27-33` codifica el problema: Trip Argentina + Story Uruguay/`UYU` espera moneda `UYU` mientras provenance declara owner/source `trip.destination`. Esto contradice la precedencia Trip + catálogos y vuelve deshonesta la provenance.

**Evidencia requerida**: Story contradictoria no debe cambiar moneda ARS derivada del countryCode AR; si se admite metadata Story como fallback, el contrato debe expresar ownership/source real por campo y la spec debe cambiar explícitamente antes del código.

#### C6 — El observer puede recibir PII desde `FinancialContext.source`

`livingContext.ts:166-172` copia `outcome.value.source` y luego lo emite como `event.source` sin allowlist ni sanitización. El test solo cubre errores rechazados; un adapter exitoso puede devolver un source arbitrario con email/token/coordenadas. La spec exige que observabilidad nunca incluya PII ni coordenadas exactas.

**Evidencia requerida**: adapter exitoso con source malicioso; observer debe recibir una categoría cerrada/sanitizada y nunca el valor crudo.

### WARNING

1. `livingContext.ts:146,172` usa `Date.now()` global para duration aunque el diseño declara reloj inyectado/pureza respecto de globals. No altera el snapshot, pero vuelve no determinista el evento observable.
2. El contrato de provenance es por módulo; no puede representar que country/timezone vienen de Trip, locale de Story/catalog y currency de catálogo. La scenario “cada campo declara owner/source” queda solo parcial.
3. `checkLivingContext.ts` valida formato de locale y compara country/timezone, pero no verifica coherencia locale-destino pese al MUST general de coherencia. No hay scenario/test específico que cierre esa obligación.
4. Los tests de “campo curado vacío” no congelan ni comparan el Story Package antes/después; la no mutación queda inferida estáticamente, no probada.

### SUGGESTION

1. Separar cache de tasa (`base`, `quote`) del cálculo puro por `amount`; reduce requests y hace explícito el boundary remoto/local.
2. Reemplazar la identidad JSON manual por dependencias completas/normalizadas o por resolvers memoizados por módulo, con tests de rerender que documenten cada frontera.

## Final Verdict

**FAIL**

Las suites están verdes, el typecheck pasa y el scope negativo se respetó, pero Strict TDD no permite aprobar con escenarios `UNTESTED`. Además, C2–C6 son incumplimientos concretos del contrato, no preferencias de estilo. Debe volver a `sdd-apply`, agregar primero los tests RED indicados, corregir la conducta y repetir verify. No archivar.
