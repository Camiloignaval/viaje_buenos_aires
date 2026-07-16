# Tasks: Living Context Foundation

## Qué revisar primero

La implementación evoluciona `app/src/features/context-engine/`; no crea endpoint, provider, UI ni segundo engine. Strict TDD prevalece sobre `config.yaml`: cada slice sigue RED → GREEN → REFACTOR y nunca ejecuta build.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900–1.400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Un `size:exception`; 4 commits temáticos |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Congelar plan | size:exception | Commit docs plan |
| 2 | Contrato y resolver | size:exception | Commit foundation |
| 3 | Módulos y React | size:exception | Commit integrations |
| 4 | Health y verificación | size:exception | Commit tests/health |

## Phase 1: Plan autónomo

- [x] 1.1 Crear rama local y commit convencional con todos los artefactos de `openspec/changes/living-context-foundation/`; preservar cambios ajenos y no hacer push.

## Phase 2: Foundation resolver/types

- [x] 2.1 **RED:** crear `app/src/features/context-engine/livingContext.test.ts` para catálogo cerrado de razones/umbrales, precedencia, ids literales, no mutación, `initial/settled`, falla aislada y observer sin datos sensibles.
- [x] 2.2 **GREEN:** extender `types.ts` y crear `livingContext.ts` con envelopes, provenance/freshness, capabilities derivadas, reloj/adapters inyectados y `Promise.allSettled`.
- [x] 2.3 **REFACTOR:** eliminar duplicación sin tocar el registry legacy; ejecutar Vitest focalizado + `npm run typecheck` y crear commit foundation.

## Phase 3: Módulos concretos

- [x] 3.1 **RED:** crear tests de `destinationContext`, `temporalContext`, `narrativeContext` y `financialContextModule` para fallback, timezone/DST, narrativa literal, story/baseStory desacoplados y stale provenance.
- [x] 3.2 **GREEN:** crear `destinationContext.ts`, `temporalContext.ts`, `narrativeContext.ts` y `financialContext.ts`; reutilizar `safeTripTemporalState` sin cambiar copy y ampliar finanzas compatiblemente con `source/fetchedAt` reales.
- [x] 3.3 **REFACTOR:** consolidar helpers solo si reducen duplicación; ejecutar pruebas focalizadas + typecheck y crear commit de módulos.

## Phase 4: Integración React/cache

- [x] 4.1 **RED:** probar `financialContextQuery.ts` y `useLivingContext.test.tsx`: entrega base inmediata, llegada sucesiva de Story, dos consumidores/un request, rerender estable y cambio de identidad aislado.
- [x] 4.2 **GREEN:** extraer query key/options, adaptar `useFinancialContext.ts`, crear `useLivingContext.ts` y exponer snapshots/`dataUpdatedAt` desde `connected/hooks/{useConnectedTrip,useConnectedContent}.ts`; sin queries nuevas de Trip/Story.
- [x] 4.3 **REFACTOR:** ejecutar pruebas focalizadas + `npm run test:react` + typecheck y crear commit de integración.

## Phase 5: Health y cierre

- [x] 5.1 **RED:** crear `story/health/livingContextCheck.test.ts` para legacy, metadata parcial, ids/destino/timezone incoherentes y mensajes sin PII/coordenadas.
- [x] 5.2 **GREEN:** crear `livingContextCheck.ts` e integrarlo mediante `healthCheck.ts`/`types.ts` con códigos/path estables `info|warning`, nunca `critical` por dinámicos futuros.
- [x] 5.3 **REFACTOR:** ejecutar `npm test`, `npm run test:react` y `npm run typecheck`; Playwright no aplica al no haber UI. Corregir regresiones, crear commit tests/health y no build.

## Phase 6: Remediación post-verify

- [x] 6.1 **RED:** agregar cobertura runtime para contexto completo/freshness/capability futura, React all-data/finanzas lentas/rerenders/cache por par, ownership/provenance/observer seguro y Health no-mutación/coherencia locale.
- [x] 6.2 **GREEN:** completar dependencias de memoización, separar tasa remota de cálculo local, aplicar freshness con reloj, ownership factual y observabilidad categórica/duración inyectada.
- [x] 6.3 **REFACTOR:** ejecutar focales, `npm test`, `npm run test:react`, `npm run typecheck` y `git diff --check`; actualizar apply-progress acumulativo y crear commit de remediación.