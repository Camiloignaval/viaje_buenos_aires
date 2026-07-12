# Archive Report: story-catalog-resolution

- **Fecha de archivado:** 2026-07-11
- **Estado final:** archived (apply: done, verify: done, archive: done)
- **Artifact store:** openspec (file-based)

## Resultado del cambio

Se desacopló la Experience del Story Package hardcodeado: la historia se resuelve
desde `baseStoryId` vía la capa `connected` + catálogo (`platformStories`). Se
agregó la Portada por viaje (`/trips/:tripId`) como entrada voluntaria a la
Experience, con 6 estados honestos (local/loading/ready/empty/not-found/error) y
sin ningún fallback implícito a Buenos Aires. La demo local quedó restringida a
desarrollo/QA (`import.meta.env.DEV`, con DCE del JSON en producción).

## Validación final (previa al archive)

- `npm run typecheck` → ✅ sin errores
- `npm test` (backend, node --test) → ✅ 131 pass / 0 fail
- `npm run test:react` (vitest) → ✅ 270 pass / 0 fail (42 archivos)
- `npm run build` → ✅ built; chunk ExperiencePage 58.01 kB (BA fuera de prod por DCE)
- Playwright (`--project=desktop`, 17 estados de galería) → ✅ 17 pass

## Checklist de tareas

- 40 tareas totales: **39 completadas `[x]`**, **1 opcional `[~]`** (6.2 galería dev,
  omitida a propósito), **0 abiertas**.

## Specs promovidas a canónicas (openspec/specs/)

Delta specs promovidas sin cambios (capacidades NUEVAS, sin deltas destructivos):

- `story-resolution` — identificador canónico `baseStoryId`; Experience consume connected.
- `story-catalog` — catálogo extensible; rechazo de ids duplicados/desconocidos.
- `trip-story-navigation` — flujo wizard → Portada → entrada voluntaria a Experience.
- `missing-story-fallback` — estados honestos, nunca fallback a Buenos Aires.

## Advertencias

- Regla `archive: "Warn before merging destructive deltas"` → **sin deltas destructivos**
  (las 4 specs son capacidades nuevas; no modifican specs previas). Sin advertencias.

## Pendientes conocidos (no bloqueantes, fuera de alcance de este cambio)

- **Sync token (Épica 5):** `syncNow` re-keyea al scope `tripId`; `api/aurora/*` no
  validado en vivo. Progreso legacy huérfano cubierto por el reset aceptado (D3).
- **Copy final** de `ExperienceUnavailable`/Portada: funcional, sujeto a pulido editorial.
- **Tarea opcional 6.2** (estado de Portada en `StatesGallery`): no realizada a propósito.
