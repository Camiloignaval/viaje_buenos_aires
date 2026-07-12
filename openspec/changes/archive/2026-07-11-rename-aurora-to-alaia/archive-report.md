# Archive Report: rename-aurora-to-alaia

- **Fecha de archivado:** 2026-07-11
- **Estado final:** archived (apply: done, verify: done, archive: done)
- **Artifact store:** openspec (file-based)

## Resultado del cambio

Migración integral de identidad **Aurora → Alaia**, con **corte limpio** (sin fallbacks):
UI visible, PWA/manifest, emails, backend, símbolos, clases CSS y variables de entorno
pasan a Alaia. Cookie renombrada (`aurora_session`→`alaia_session`), rutas `/api/alaia/*`
únicas (sin aliases), folders Cloudinary `alaia/*`. Se conserva la IndexedDB `aurora-photos`
(invisible) y la documentación histórica. Sin cambios de comportamiento ni arquitectura.

## Commits (8, temáticos)

1. `457041f` feat(brand): migrate persisted aurora:* keys to alaia:* (idempotent)
2. `6e05f9d` feat(brand): use Alaia across visible UI and PWA manifest
3. `38cef3d` feat(brand): brand emails as Alaia (layout, copy, domain)
4. `a3f5615` refactor(brand): rename backend to Alaia (/api/alaia/*, alaia_session, libs, folders)
5. `f958d35` refactor(brand): rename aurora CSS classes and code symbols to Alaia
6. `f87afba` chore(brand): remove stale/duplicate aurora assets
7. `c3f04c9` chore(brand): scrub remaining Aurora labels (Studio, comments)
8. `1c6ce8f` refactor(brand): rename AURORA_* env vars to ALAIA_* (clean cut, no fallback)

## Validación final (previa al archive)

- `npm run typecheck` → ✅ sin errores
- `npm test` (backend) → ✅ 131/131
- `npm run test:react` → ✅ 274/274 (43 archivos)
- `npm run build` → ✅ OK; manifest `Alaia — Buenos Aires 2026` / `Alaia`
- Playwright (`--project=desktop`) → ✅ 17/17

## Contratos finales

- **Storage:** claves `alaia:*` (migradas idempotentemente desde `aurora:*`, sin borrar viejas).
- **Cookie:** `alaia_session`.
- **IndexedDB:** `aurora-photos` (conservada).
- **API:** `/api/alaia/{story,photo-upload,sync}` (sin `/api/aurora/*`).
- **Env vars:** `ALAIA_*` (ver README/Vercel).
- **Dominio:** `alaia.cl`.

## Referencias Aurora restantes (clasificadas — no son bugs)

- **Migración intencional:** `brandMigration.ts/.test.ts` (`aurora:` como OLD_PREFIX).
- **Conservado técnico:** IndexedDB `aurora-photos` (photoStore.ts).
- **Fixture (no marca):** `"Hotel Aurora"` en tests (nombre de lugar).
- **Documentación histórica:** `documentacion/*.md`, `docs/*.md`, `app/README.md` (snapshot pre-migración; refresh recomendado aparte).

## Specs promovidas a canónicas (openspec/specs/)

- `brand-identity` — identidad Alaia visible + símbolos de código.
- `storage-migration` — migración idempotente de claves persistidas.

## Advertencias / pendientes

- **Vercel:** las variables deben renombrarse a `ALAIA_*` en el dashboard (y en `.env.local`)
  en simultáneo con este deploy — el código ya NO lee `AURORA_*`.
- `app/README.md` describe arquitectura pre-migración (stale); refresh fuera de alcance del RC.
