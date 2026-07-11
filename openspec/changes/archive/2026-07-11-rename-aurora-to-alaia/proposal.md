# Proposal: Migración integral de marca Aurora → Alaia (rename-aurora-to-alaia)

## Intención

Completar la migración de identidad **Aurora → Alaia** en todo el producto (UI visible,
PWA, emails, backend, código) **sin romper** sesiones activas, datos locales
(recuerdos, progreso, álbum, tokens), la PWA instalada, los emails ni el backend.
Es un cambio de **identidad**, no de comportamiento ni de arquitectura.

## Inventario (resumen; detalle por categoría en design.md)

Referencias verificadas por grep en todo el repo (excluyendo `dist/`, `node_modules/`):

- **Contratos persistidos (riesgo alto):**
  - localStorage/sessionStorage: `aurora:progress:*`, `aurora:memories:*`, `aurora:sync-token:*`, `aurora:${scope}:theme`, `aurora:intro-video-2-seen:*`.
  - IndexedDB: base `aurora-photos` (fotos del álbum).
  - Cookie de sesión: `aurora_session` (`platformAuth.js`).
- **Rutas backend:** `app/api/aurora/{story,photo-upload,sync}.js` + llamadas cliente `fetch("/api/aurora/*")`.
- **Visible al usuario:** PWA manifest (`name: "Aurora — Buenos Aires 2026"`, `short_name: "Aurora"`), copy en login/onboarding/trips/experience/feedback/errores/opening, títulos.
- **Símbolos/archivos:** `AuroraParticles.tsx`, `AuroraLayout.js` (email), `auroraStory.ts`/`auroraStoryPackage`, `lib/auroraMongo.js` (`isAuroraBackendConfigured`), `lib/auroraCloudinary.js`.
- **CSS:** clases `aurora-*` (≈76 en `shell.css`, 19 en `experience.css`, + consumidores).
- **Fixtures/tests:** dominio `aurora.cl`, `to: test@aurora.cl`, `subject: "Bienvenido a Aurora"`, claves en tests.
- **Contenido histórico:** `documentacion/*AURORA*.md`, `docs/00_AURORA_CONSTITUTION.md`.
- **Ya migrados (no tocar):** `api/health.js` (`service: 'alaia'`), `EMAIL_FROM` config (`Alaia <noreply@alaia.cl>`), feature `opening` (`AlaiaOpening`, clave `alaia:opening:*`).
- **Assets stale:** `public/aurora-intro.mp4`, `public/aurora-present.mp4` (duplicado ya excluido).

## Alcance (in-scope)

- Renombrar **claves persistidas** `aurora:*` → `alaia:*` con **migración automática e idempotente** (copy-if-absent en el arranque) + ventana de compatibilidad de lectura.
- Cambiar **todo lo visible**: manifest PWA, copy, títulos, metadata, remitente/asuntos/templates de email, logs visibles.
- Convertir **nombres internos vinculados a la marca** a Alaia o neutrales (símbolos, archivos, clases CSS) — según decisión (ver Decisiones abiertas).
- Limpiar assets stale sin referencia.
- Actualizar fixtures/tests/snapshots afectados.

## Fuera de alcance (no-goals)

- **No** cambiar comportamiento funcional ni arquitectura de producto.
- **No** cerrar sesiones: la cookie `aurora_session` se **conserva** (decisión aprobada).
- **No** migrar la base IndexedDB `aurora-photos` (recomendado conservar; ver Decisiones abiertas).
- **No** reemplazo global ciego (`sed s/aurora/alaia/g`): cada categoría se trata según su clasificación.
- **No** reescribir documentación histórica (se conserva como registro; solo se ajusta lo user-facing si aplica).
- **No** tocar la Épica 5 de sync más allá del rename de ruta (si se aprueba).

## Riesgos (resumen; detalle en design.md)

- Pérdida de datos locales si la migración de claves no es idempotente/segura → mitigado con copy-if-absent + no borrar `aurora:*` en la ventana de compat.
- Romper la PWA instalada al cambiar `name`/`short_name` → el SO puede mantener el ícono viejo; aceptable, no destructivo.
- Renombrar `/api/aurora/*` sin lockstep cliente-servidor → romper sync; mitigado tratándolo como decisión con lockstep o conservando la ruta.
- Churn masivo y regresiones visuales al renombrar clases CSS → mitigado con rename mecánico verificado por build + e2e de galería.

## Rollback

Como las claves `aurora:*` **no se borran** durante la ventana de compatibilidad y la
cookie/IndexedDB se conservan, revertir el código restaura el comportamiento anterior
sin pérdida de datos. Detalle pieza por pieza en design.md.

## Decisiones (CERRADAS — aprobadas por el usuario)

1. **Clases CSS `aurora-*` y `AuroraParticles`:** ✅ **renombrar** a `alaia-*`/`brand-*`/neutral.
2. **Rutas `/api/aurora/*`:** ✅ **renombrar** a `/api/alaia/*` en lockstep (cliente+servidor).
3. **IndexedDB `aurora-photos`:** ✅ **conservar** (invisible; migrar = riesgo alto sin beneficio).
4. **Dominio de producción:** ✅ **`alaia.cl`** (EMAIL_FROM/appUrl/CORS/fixtures).

Sin decisiones abiertas. El plan está listo para revisión y aprobación de apply.
