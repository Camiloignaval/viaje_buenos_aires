# Design: Migración integral de marca Aurora → Alaia

## Enfoque técnico

Tratar cada aparición según su **clasificación**, nunca con reemplazo global. Tres
mecanismos:
1. **Visible** → cambiar el texto/valor a "Alaia".
2. **Contrato persistido** → migración automática idempotente (copy-if-absent) +
   ventana de compat de lectura; escribir solo claves nuevas.
3. **Identificador técnico vinculado a la marca** → renombrar a Alaia/neutral por
   rename mecánico verificado (o conservar si es estable y no aporta claridad).

---

## 1. Clasificación del inventario

| # | Categoría | Ejemplos | Clase | Acción |
|---|-----------|----------|-------|--------|
| A | Marca visible | manifest name/short_name, copy login/onboarding/trips/experience/feedback/errores/opening, títulos | visible | → "Alaia" |
| B | Claves persistidas | `aurora:progress/memories/sync-token/theme/intro-video-2-seen:*` | contrato persistido | migrar `alaia:*` idempotente |
| C | Cookie sesión | `aurora_session` | contrato persistido | **conservar** (aprobado) |
| D | IndexedDB | base `aurora-photos` | contrato persistido | **conservar** (recomendado) |
| E | Rutas API | `/api/aurora/*` | identificador técnico | decisión: renombrar lockstep / conservar |
| F | Símbolos/archivos | `AuroraParticles`, `AuroraLayout`, `auroraStory`, `auroraMongo`, `auroraCloudinary`, `isAuroraBackendConfigured` | técnico vinculado a marca | renombrar a Alaia/neutral |
| G | Clases CSS | `aurora-*` (shell.css, experience.css, consumidores) | técnico vinculado a marca | decisión: renombrar / conservar |
| H | Emails | from, subjects, templates, `AuroraLayout`, `aurora.cl`, appUrl | visible + config | → Alaia / dominio decidido |
| I | Backend público | logs, health/version, nombres | mixto | health ya `alaia`; ajustar logs visibles |
| J | Fixtures/tests/snapshots | `aurora.cl`, `test@aurora.cl`, claves en asserts | fixture | actualizar junto al código |
| K | Documentación | `documentacion/*AURORA*.md`, `docs/00_AURORA_CONSTITUTION.md` | histórico | conservar (registro) |
| L | Assets stale | `public/aurora-intro.mp4`, `aurora-present.mp4` | basura | excluir/eliminar |

---

## 2. Migración de localStorage / sessionStorage (idempotente)

**Familias de claves** (builders a re-prefijar a `alaia:`):
- `progressKey` → `alaia:progress:${storyId}` (`story/engine/progressStore.ts`)
- `memoriesKey` → `alaia:memories:${storyId}` (`album/data/memoryStore.ts`)
- `syncTokenKey` → `alaia:sync-token:${storyId}` (`sync/syncClient.ts`)
- `themeStorageKey` → `alaia:${scope}:theme` (`experience/hooks/useExperience.ts`)
- `introSeenKey` → `alaia:intro-video-2-seen:${scope}` (`useExperience.ts`, sessionStorage)

**Util nueva** `app/src/lib/brandMigration.ts`:
```ts
// Idempotente: copia cada clave aurora:* a alaia:* SOLO si el destino no existe.
// No borra las claves viejas (ventana de compat). Segura ante reejecución y ante
// storage bloqueado (try/catch). Corre una vez por storage al arrancar la app.
export function migrateAuroraKeys(storage: Storage): void {
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !key.startsWith("aurora:")) continue;
      const target = "alaia:" + key.slice("aurora:".length);
      if (storage.getItem(target) === null) {
        const value = storage.getItem(key);
        if (value !== null) storage.setItem(target, value);
      }
    }
  } catch { /* storage no disponible (modo privado): la app sigue */ }
}
```
- **Invocación:** una vez en el arranque (p. ej. `main.tsx` o `AppProviders`), para
  `localStorage` y `sessionStorage`, ANTES del primer render que lea claves.
- **Idempotencia:** copy-if-absent → reejecutar no pisa datos ya migrados ni datos
  nuevos escritos en `alaia:*`.
- **Compat de lectura (ventana):** opcional, un helper `readBrandKey(base)` que lee
  `alaia:base` y cae a `aurora:base` si falta. Alternativa más simple: como la
  migración corre antes del primer read y es copy-if-absent, el fallback de lectura
  no es estrictamente necesario; se documenta como red de seguridad para claves
  escritas por pestañas viejas durante el despliegue.
- **Escritura:** tras el rename de builders, la app escribe **solo** `alaia:*`.
- **Borrado de `aurora:*`:** **diferido** (fuera de este cambio) — limpieza posterior
  cuando la ventana de compat cierre.

---

## 3. IndexedDB `aurora-photos` (Decisión D-IDB — recomendado CONSERVAR)

Renombrar una base IndexedDB no es un rename: exige abrir la vieja, copiar todos los
object stores a una nueva, verificar y borrar la vieja — riesgoso, asíncrono y sin
beneficio para el usuario (la DB es invisible). **Recomendación: conservar `aurora-photos`**
como identificador técnico estable (mismo criterio que la cookie). Si se aprobara
migrar, iría en un cambio propio con doble lectura y verificación de conteo.

---

## 4. Cookie `aurora_session` → `alaia_session` (rename limpio)

`SESSION_COOKIE_NAME = 'alaia_session'`. No se conservan sesiones antiguas: las sesiones
con la cookie vieja simplemente dejan de reconocerse (el usuario vuelve a entrar). Sin
migración de cookie. Actualizar `platformAuth.js` + su test + comentarios que la nombran.

---

## 5. Branding visible (categoría A)

| Superficie | Archivo(s) | Cambio |
|-----------|-----------|--------|
| Login | `features/auth/pages/LoginPage.tsx`, `EmailStep.tsx`, `CodeStep.tsx`, `CheckingSession.tsx`, `SessionUnavailable.tsx` | copy "Aurora" → "Alaia" |
| Onboarding/Wizard | `components/wizard/WizardShell.tsx`, `features/onboarding/*` | copy |
| Trips | `features/trips/pages/TripsPage.tsx` | eyebrow/título "Aurora" → "Alaia" |
| Experience | `experience/components/ExperienceUnavailable.tsx`, `ExperienceView.tsx`, `Banners.tsx` | copy "Aurora" |
| Feedback/Errores | `components/feedback/RouteError.tsx` | copy |
| Opening | ya "Alaia" (sin cambios) | — |

> Nota: la palabra "Aurora" en copy narrativo/histórico de `documentacion/` NO es visible en la app; se deja como contenido histórico.

## 6. PWA

- `vite.config.js` → `VitePWA.manifest`: `name: "Alaia — …"`, `short_name: "Alaia"`,
  `description` sin "Buenos Aires" fijo si se desea (opcional). `theme_color`/iconos:
  revisar que los iconos no tengan wordmark "Aurora" (assets en `public/icons/`).
- Service worker: se regenera en build (workbox); precache toma los assets vigentes.
  Cambiar el manifest **no** invalida datos; la PWA instalada puede conservar el ícono
  viejo hasta reinstalar (no destructivo).

## 7. Emails

- Remitente: `EMAIL_FROM` (config/env) ya `Alaia <noreply@alaia.cl>` → verificar valor productivo.
- `AuroraLayout.js` → renombrar a `BrandLayout.js`/`AlaiaLayout.js` (símbolo F).
- Asuntos/copy/preview de templates (`WelcomeEmail`, `VerifyEmail`, `DailyMomentEmail`, etc.) → "Alaia".
- `appUrl`/dominio en templates y tests → dominio decidido (D-DOMAIN).
- Logs de envío → "Alaia".

## 8. Backend

- `api/health.js` ya `service: 'alaia'`; `api/version.js` verificar nombre.
- Logs visibles con "Aurora" → "Alaia".
- `lib/auroraMongo.js` (`isAuroraBackendConfigured`), `lib/auroraCloudinary.js` → renombrar
  archivo+símbolos a `platformSyncMongo`/`platformMediaStore` o `alaiaMongo` (símbolo F).
- **Rutas API (D-API = rename limpio, SIN aliases):** los handlers se mueven a
  `app/api/alaia/{story,photo-upload,sync}.js` y `app/api/aurora/*` se **elimina** por
  completo (no hay datos en prod que proteger). **Consumidores migran a `/api/alaia/*`:**
  `syncClient.ts` (photo-upload, sync) y `adminView.js` (story). Frontend y backend usan
  **únicamente** `/api/alaia/*`. Test: no queda ninguna referencia a `/api/aurora/` en el
  código.
- **Cloudinary folders (D-CLOUDINARY = rename):** `aurora/${storyId}` (photo-upload) y los
  prefijos `USER_MEDIA_FOLDER_PREFIX`/`STORY_MEDIA_FOLDER_PREFIX` (`aurora/trips`,
  `aurora/stories`) → `alaia/*`. Sin contenido persistido que huérfanar.
- **Env vars `AURORA_*` (D-ENV = conservar):** `AURORA_JWT_SECRET`, `AURORA_AUTH_CODE_SECRET`,
  `AURORA_ADMIN_PASSWORD`, `AURORA_MONGODB_URI`, `AURORA_AUTH_CODE_DELIVERY` son contrato de
  deploy (Vercel). Se conservan; su rename es un cambio de infra coordinado, fuera de este
  cambio (documentado en el informe).

## 9. Código (símbolos/archivos/CSS/tests)

- **Símbolos F:** `AuroraParticles`→`BrandParticles`/`AlaiaParticles`; `auroraStoryPackage`→`demoStoryPackage`; `auroraStory.ts`→`demoStory.ts`; layout/mongo/cloudinary arriba. Rename + actualizar imports; verificado por typecheck.
- **CSS G (decisión):** `aurora-*`→`alaia-*` (o neutral `brand-*`) por rename mecánico en `shell.css`/`experience.css`/`alaiaOpening.css` + todos los `className` consumidores. Alto volumen; verificar por build + e2e de galería (screenshots).
- **Tests/fixtures J:** actualizar asserts de claves (`aurora:*`→`alaia:*` + un test de la migración), dominios, subjects.

## 10. Dominio y URLs (Decisión D-DOMAIN)

`aurora.cl` aparece en fixtures/appUrl. Definir dominio real (`alaia.cl`?) y ajustar
`EMAIL_FROM`, `appUrl`, CORS/allowed origins, y fixtures. Parte es config/DNS (externo).

---

## Arquitectura actual vs objetivo

### Actual
```
Marca mezclada: opening=Alaia, health=alaia, EMAIL_FROM=Alaia
  pero: manifest="Aurora", copy UI="Aurora", claves storage=aurora:*,
        IndexedDB=aurora-photos, cookie=aurora_session, /api/aurora/*,
        símbolos AuroraX, clases CSS aurora-*
```
### Objetivo
```
Marca Alaia consistente en TODO lo visible + código vinculado a marca.
Contratos persistidos:
  - localStorage/sessionStorage: alaia:*  (migrados idempotentemente desde aurora:*)
  - IndexedDB aurora-photos: CONSERVADO (técnico invisible)
  - cookie aurora_session: CONSERVADA (sin cerrar sesiones)
Sin cambios de comportamiento ni arquitectura.
```

## Decisiones de arquitectura (ADR)

| # | Decisión | Alternativa rechazada | Rationale |
|---|----------|-----------------------|-----------|
| D1 | Migración storage = copy-if-absent al arranque, sin borrar viejas | Renombrar en caliente / borrar viejas | Idempotente, sin pérdida, rollback trivial |
| D2 | Conservar cookie `aurora_session` | Renombrar cookie | No cerrar sesiones (aprobado); rename exige lockstep |
| D3 | Conservar IndexedDB `aurora-photos` | Migrar la DB | Invisible; migrar DB = riesgo alto, beneficio nulo |
| D4 | No reemplazo global; tratar por categoría | `sed s/aurora/alaia/g` | Evita romper contratos y contenido histórico |
| D5 | Docs históricos se conservan | Reescribir docs | Son registro; no visibles en la app |
| D-API | **CERRADA: `/api/alaia/*` ÚNICO, SIN aliases** (se elimina `/api/aurora/*`) | mantener alias temporal | no hay datos en prod; migración limpia y definitiva |
| D-CSS | **CERRADA: renombrar `aurora-*` → `alaia-*`/`brand-*`** + `AuroraParticles`→neutral | conservar como estética | quita la marca del código; churn aceptado, verificado por build+e2e |
| D-COOKIE | **CERRADA: renombrar `aurora_session` → `alaia_session`** | conservar cookie | no se conservan sesiones; migración limpia |
| D-CLOUDINARY | **CERRADA: renombrar folders `aurora/*` → `alaia/*`** | conservar folders | no hay contenido persistido que huérfanar |
| D-DOMAIN | **CERRADA: `alaia.cl`** (EMAIL_FROM/appUrl/CORS/fixtures) | mantener aurora.cl | dominio de marca definitivo |
| D-IDB | **CERRADA: conservar `aurora-photos`** | migrar la DB | migrar no aporta valor y agrega riesgo |
| D-ENV | **CERRADA: conservar env vars `AURORA_*`** (deploy contract) | renombrar | rename exige cambio coordinado en Vercel; sin eso, auth rompe. Documentado como pendiente de infra |

## Estrategia de rollback (por pieza)

- **Storage:** revertir builders a `aurora:*`; como no se borraron las viejas, los datos siguen. Sin pérdida.
- **Migración util:** quitar la llamada de arranque; inerte.
- **Visible/PWA/emails:** revertir textos/manifest; sin efecto en datos.
- **CSS/símbolos:** revertir el rename (git); build vuelve al estado previo.
- **API (si se renombró):** revertir ruta+cliente juntos.

## Comandos de validación

| Área | Comando |
|------|---------|
| Tipos/símbolos/CSS consumidores | `npm run typecheck` |
| Backend (libs, migración lógica JS) | `npm run test` |
| Cliente (migración storage, componentes) | `npm run test:react` |
| Build + PWA manifest | `npm run build` (verificar manifest generado) |
| Regresión visual galería | `npm run test:e2e` (playwright screenshots) |

## Migración / Rollout

Sin migración destructiva. Las claves viejas persisten en la ventana de compat; la
cookie e IndexedDB se conservan. Cambio detrás de rama; rollback pieza por pieza.
