# Tasks: Migración integral de marca Aurora → Alaia

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas estimadas | Alta (rename CSS masivo si se aprueba D-CSS); resto moderado |
| 400-line budget risk | High (por CSS/símbolos) |
| Chained PRs recommended | Yes (por fase) |
| Decision needed before apply | **No** — 4 decisiones cerradas (D-CSS=rename, D-API=rename lockstep, D-IDB=conservar, D-DOMAIN=alaia.cl) |

**Sin decisiones pendientes.** Solo falta la aprobación explícita del plan para arrancar apply.

---

## Fase 1: Migración de storage (contrato persistido — primero y verificado)

- [x] 1.1 Crear `app/src/lib/brandMigration.ts` con `migrateAuroraKeys(storage)` (copy-if-absent, try/catch, idempotente)
- [x] 1.2 Invocar la migración en el arranque (`main.tsx`/`AppProviders`) para `localStorage` y `sessionStorage`, antes del primer read
- [x] 1.3 Re-prefijar builders a `alaia:`: `progressKey`, `memoriesKey`, `syncTokenKey`, `themeStorageKey`, `introSeenKey`
- [x] 1.4 Test (`test:react`) de `migrateAuroraKeys`: copia, idempotencia (no pisa nuevos), storage bloqueado no rompe
- [x] 1.5 Actualizar tests que asertan claves (`progressStore.test`, `memoryStore.test`, `useExperience.test`, `AlaiaOpening.test`) a `alaia:*`
- [x] 1.6 Validación: `npm run typecheck && npm run test:react`

## Fase 2: Branding visible (categoría A) + PWA

- [x] 2.1 `vite.config.js` manifest: `name`/`short_name`/`description` → Alaia
- [x] 2.2 Copy visible: login (`LoginPage`,`EmailStep`,`CodeStep`,`CheckingSession`,`SessionUnavailable`), `WizardShell`, `TripsPage`, `ExperienceUnavailable`/`ExperienceView`/`Banners`, `RouteError`
- [x] 2.3 Revisar iconos PWA (`public/icons/`) por wordmark "Aurora" (si aplica, marcar para diseño)
- [x] 2.4 Validación: `npm run test:react && npm run build` (verificar manifest generado)

## Fase 3: Emails

- [x] 3.1 Renombrar `AuroraLayout.js` → `BrandLayout.js`/`AlaiaLayout.js` + imports
- [x] 3.2 Asuntos/copy/preview de templates → Alaia; `appUrl`/dominio → D-DOMAIN
- [x] 3.3 Verificar `EMAIL_FROM` productivo = Alaia; logs de envío → Alaia
- [x] 3.4 Actualizar `email.test.js`/`sendEmail.test.js` (dominio, subject, appUrl)
- [x] 3.5 Validación: `npm run test`

## Fase 4: Backend (logs, libs, rutas)

- [x] 4.1 Renombrar `lib/auroraMongo.js`/`auroraCloudinary.js` + símbolos (`isAuroraBackendConfigured`) a Alaia/neutral + imports
- [x] 4.2 Logs visibles "Aurora" → "Alaia"; verificar `api/version.js`
- [x] 4.3 **[D-API=rename limpio, SIN alias]** Mover handlers a `api/alaia/{story,photo-upload,sync}.js` y **eliminar** `api/aurora/`. Cookie `aurora_session`→`alaia_session`. Cloudinary `aurora/*`→`alaia/*`. Migrar consumidores a `/api/alaia/*`: `syncClient.ts` (photo-upload, sync) y `adminView.js` (story)
- [x] 4.3b (obsoleto) Sin aliases → sin test de equivalencia. Verificación: cero referencias a `/api/aurora/` en el código
- [x] 4.3c **Corte limpio env vars** `AURORA_*`→`ALAIA_*` (sin fallback; Vercel actualizado en simultáneo por el usuario)
- [x] 4.4 Validación: `npm run test`

## Fase 5: Código — símbolos, CSS, fixtures

- [x] 5.1 Renombrar símbolos F: `AuroraParticles`, `auroraStoryPackage`/`auroraStory.ts` → neutral/demo + imports
- [x] 5.2 **[D-CSS=rename]** Rename mecánico `aurora-*` → `alaia-*`/`brand-*` en `shell.css`, `experience.css`, `alaiaOpening.css` + todos los `className` consumidores; `AuroraParticles` → nombre neutral
- [x] 5.3 Actualizar fixtures/snapshots restantes
- [x] 5.4 Validación: `npm run typecheck && npm run test:react && npm run test:e2e`

## Fase 6: Assets y cierre

- [x] 6.1 Eliminar/excluir assets stale sin referencia: `public/aurora-intro.mp4`, `public/aurora-present.mp4`, `blbala.png`, `logo original.png` (confirmar con el usuario)
- [x] 6.2 Validación completa: `npm run typecheck && npm run test && npm run test:react && npm run build && npm run test:e2e`

---

## Plan de commits (propuesta)

Commits temáticos por fase (esta vez SÍ es viable: el working tree parte limpio):

1. `feat(brand): migrate persisted aurora:* keys to alaia:* (idempotent)` — Fase 1
2. `feat(brand): use Alaia across visible UI and PWA manifest` — Fase 2
3. `feat(brand): brand emails as Alaia` — Fase 3
4. `refactor(brand): rename backend aurora symbols/routes to Alaia` — Fase 4 (+API si D-API)
5. `refactor(brand): rename aurora code symbols and CSS classes` — Fase 5 (si D-CSS)
6. `chore(brand): remove stale aurora assets` — Fase 6

## Criterios de aceptación

- Migración idempotente verificada por test; sin pérdida de datos; sesiones intactas.
- Cero "Aurora" en superficies visibles y emails; contenido histórico conservado.
- typecheck + backend + react + build + e2e en verde.
- Sin cambios de comportamiento/arquitectura.

## Out of Scope (recordatorio)

- Borrado de claves `aurora:*` viejas (limpieza posterior; hoy quedan inertes).
- Migración de IndexedDB `aurora-photos` (conservada por decisión — invisible).
- Reescritura de documentación histórica (`documentacion/`, `docs/`, `app/README.md` stale).
- Cambios funcionales de la Épica 5 de sync (más allá del rename de ruta/cookie/folders).

## Resultado real (corte limpio)

- Ejecutado en **8 commits temáticos** (6 fases + scrub de labels + corte de env vars).
- Cookie **renombrada** a `alaia_session` (no conservada). Cloudinary folders → `alaia/*`. Env vars → `ALAIA_*` sin fallback.
- IndexedDB `aurora-photos` conservada. Docs históricos conservados.
