# IMPLEMENTATION_PHASE_3.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Tercera fase de implementación — primera conexión aislada con Presentation.
**Estado:** Propuesta — sin código escrito todavía. A la espera de aprobación.

---

## Objetivo de la fase

Crear una **vista de depuración aislada** que permita ver, con los ojos, que Story Package + Story Progress + Story Engine funcionan juntos de verdad — sin construir todavía ni un gramo de la UI real de Aurora.

Es una herramienta de desarrollo, no un prototipo de producto. Su única audiencia somos vos y yo, mientras seguimos construyendo el motor.

## Alcance

**Incluido en esta fase:**
- Una página HTML nueva y separada, con su propio punto de entrada — nunca se navega a ella desde la app principal, ni ella navega hacia la app principal.
- Carga del Story Package real (`story-ba2026.json`) a través de `loadStoryPackage` (Fase 1).
- Controles simples para simular `now` (fecha) y el estado de cada capítulo (`chapterStatuses`).
- Ejecución de `getStoryView` (Fase 2) ante cada cambio, y volcado legible de todo su resultado.
- Cinco escenarios preestablecidos (un botón cada uno) que reproducen exactamente los casos que pediste.

**Explícitamente fuera de esta fase:**
- Tocar `main.js`, `index.html` (raíz o de `app/`), o cualquier archivo de la UI actual.
- Cualquier diseño visual — la vista de depuración se ve como lo que es: una herramienta interna, sin marca, sin estilos de Aurora.
- Memory Engine, Album Engine, PWA, manifest, service worker.
- Persistencia real del progreso — los estados de capítulo simulados viven solo en memoria del navegador mientras la página está abierta; al recargar, se pierden. Es correcto para esta fase.

## Cómo se simula el progreso

Por diseño (Fase 1), un capítulo nunca puede "forzarse" a `locked` o `available` — esos dos estados siempre se calculan a partir de la fecha y del capítulo anterior. Lo único que una acción externa puede fijar es `started` o `completed` (son los estados "pegajosos"). Por eso, el control de cada capítulo en la vista de depuración ofrece exactamente tres opciones, no cuatro:

- **No forzar** (default) — el estado sale del cálculo normal de Story Progress.
- **Marcar como Iniciado**
- **Marcar como Finalizado**

Esto no es una limitación de la herramienta — es la máquina de estados real, visible tal cual es.

## Los cinco escenarios preestablecidos

| Botón | `now` | Capítulos forzados | Resultado esperado |
|---|---|---|---|
| Antes del viaje | `2026-07-10` | ninguno | `currentMode: "pre_trip"` |
| Día 1 disponible | `2026-07-18` | ninguno | `chapter-1` disponible, `currentMode: "in_progress"` |
| Día 1 completado | `2026-07-19` | `chapter-1: completed` | `chapter-2` disponible |
| Epílogo disponible | `2026-07-22` | `chapter-1..4: completed` | `currentMode: "epilogue"` |
| Memory mode | `2026-07-22` | `chapter-1..4` + `chapter-epilogue: completed` | `currentMode: "memory_mode"` |

Cada botón deja además los controles manuales en el mismo estado que fijó, para poder seguir explorando desde ahí a mano.

## Qué archivos crearás

| Archivo | Responsabilidad única |
|---|---|
| `app/debug.html` | Estructura mínima de la página: controles + un área de salida. Sin estilos de marca. |
| `app/src/debug/debugView.js` | Conecta los controles con `loadStoryPackage` + `getStoryView`, y vuelca el resultado. |
| `app/src/debug/scenarios.js` | Los cinco escenarios preestablecidos, como datos — separados de la lógica de conexión. |
| `app/src/debug/README.md` | Deja explícito que esto es una herramienta de desarrollo, no el inicio de la UI real. |

## Qué archivos modificarás

Ninguno. `app/debug.html` es un segundo punto de entrada de Vite — el servidor de desarrollo (`npm run dev`) sirve cualquier `.html` que exista en la raíz del proyecto sin configuración adicional (confirmé que no hay `vite.config.*` en `app/`, por lo que aplica el comportamiento por defecto). No hace falta tocar `package.json` ni ningún archivo de build.

## Qué componentes crearás

- **Debug View**: un pequeño controlador de Presentation, deliberadamente el más simple posible (JS plano manipulando el DOM, igual que `main.js` — sin frameworks). Su única lógica es: leer los controles → armar `context` → llamar a `getStoryView` → mostrar el resultado.

## Qué componentes reutilizarás

- `loadStoryPackage`, `getStoryView` y `story-ba2026.json` completos, sin modificarlos.
- El mismo patrón de módulo con README, aunque en este caso el README aclara que **no** es un dominio reutilizable — es una herramienta.

## Qué riesgos existen

- **No verifiqué en vivo que `npm run dev` sirva `debug.html`** — es el comportamiento documentado por defecto de Vite sin config, pero lo voy a confirmar corriendo el servidor como parte de la validación de esta fase, no solo asumiéndolo.
- **`vite build` no incluye `debug.html`** a menos que se configure explícitamente como entrada adicional — a propósito: no queremos que una herramienta de desarrollo termine en el build de producción. Si algún día hace falta, es una decisión aparte.
- **El progreso simulado no sobrevive a un refresh de página** — esperado y correcto para esta fase, pero puede resultar confuso si no se explica en pantalla; lo dejo como un texto fijo dentro de la propia página.

## Cómo validaremos que la fase quedó terminada

- Corriendo `npm run dev`, `http://localhost:5173/debug.html` (o el puerto que asigne Vite) carga y muestra un `StoryView` inicial.
- Cada uno de los cinco escenarios, al hacer clic, produce exactamente el `currentMode` esperado en la tabla de arriba.
- Cambiar la fecha o el estado de un capítulo a mano recalcula la vista sin recargar la página.
- `git status` no muestra ningún archivo modificado fuera de los cuatro nuevos.
- `main.js` y el resto de la app siguen funcionando exactamente igual que antes (se verifica abriendo `index.html`/`app/index.html` normalmente, sin relación con `debug.html`).
- `npm test` sigue en 22/22 — esta fase no toca ningún módulo de dominio.

## Qué queda pendiente para la siguiente fase

- Empezar el diseño real de Presentation (probablemente arrancando por el capítulo actual — `visibleChapter` — como primera pantalla real, ya con estilo de Aurora).
- Memory Engine, para que "Marcar como Finalizado" dependa de datos reales capturados y no de un botón simulado.
- Persistencia del progreso (Synchronization), para que dejar de simular tenga sentido.

---

*Sin código escrito. A la espera de tu aprobación antes de crear el primer archivo.*
