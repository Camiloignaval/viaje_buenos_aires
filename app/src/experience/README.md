# experience

**Qué es:** la primera pantalla real de Aurora — usa la voz de marca y el Story Engine de verdad, pero sigue completamente aislada de `main.js` y de la app actual. Se abre en `/experience.html`.

**Responsabilidad de cada archivo:**
- `render.js` — función pura: `StoryView` + Story Package + `now` + opciones (`interactive`, `memories`, `photoUrls`, `installBanner`, `pendingNotification`, etc.) → HTML. Sin DOM, sin reloj propio, sin IndexedDB, sin `Notification` — recibe todo ya resuelto. Un caso por `currentMode`, más el Álbum del viaje (independiente del modo).
- `chapterContent.js` — función pura: dado un capítulo y el Story Package, resuelve sus relaciones (lugar de cada actividad, photo spots, ítems de colección relacionados). No arma HTML — `render.js` es quien lo consume.
- `notifications.js` (Épica 4) — función pura: `StoryView` + Story Package + `now` → una notificación significativa posible (o `null`). No toca `Notification`, no persiste nada — ver su propio comentario de cabecera sobre por qué esto nunca es una alarma en segundo plano.
- `experienceView.js` — el único archivo que toca `document` (y el único que hace trabajo asíncrono): carga `story-ba2026.json`, ejecuta `getStoryView`, lee/escribe progreso y Memorias, resuelve las fotos guardadas (IndexedDB → object URLs) antes de cada render, decide instalación/notificaciones, registra el Service Worker, maneja los clicks/cambios de los controles e inyecta el resultado de `render.js`.
- `experience.css` — estilos mínimos y aislados, sin relación con `style.css` de la app actual.

**Qué NO hace:**
- No implementa Album Engine (real, con sincronización) ni backend de ningún tipo — las fotos viven 100% en el navegador (IndexedDB), sin Cloudinary ni MongoDB.
- No comprime ni optimiza imágenes, ni soporta video todavía (decisión explícita de la Épica 3).
- No envía notificaciones en segundo plano (app cerrada) — eso requiere Push + servidor (prohibido) o la Notification Triggers API, que nunca se estabilizó en ningún navegador. Lo que sí hace: evaluar si hoy es significativo cada vez que Aurora se abre o vuelve a primer plano, y mostrar una notificación nativa en ese momento (ver `notifications.js`).
- No tiene splash screens por dispositivo para iOS (esa matriz tiene ~15 tamaños exactos) — usa un único splash genérico, proporcionado para una app personal de 2 personas.

**Dominios que conoce:** Story Package, el resultado de Story Engine (`StoryView`), y Memory Engine (Memorias y fotos) — siempre recibidos ya resueltos desde `experienceView.js`, nunca leídos directamente por `render.js`.

**Dominios que no debe conocer:** Story Access, Synchronization, Media Storage (real, con backend). `render.js` no sabe cómo se guarda nada — solo recibe strings, arrays y URLs ya resueltas.

## PWA (Épica 4)

Aurora se puede instalar como app (`experience.html` es la única página instalable — `debug.html`, `memories.html` y el prototipo viejo `index.html` quedan explícitamente afuera, ver `vite.config.js`).

- **Manifest + íconos**: generados por `vite-plugin-pwa` (manifest) y por `scripts/generate-icons.mjs` (íconos PNG reales, codificados a mano con `node:zlib` — no hay herramientas de imagen instaladas en esta máquina, así que no se generan con ninguna librería).
- **Service Worker**: `vite-plugin-pwa` (estrategia `generateSW`, autoUpdate). Se registra **únicamente** desde `experienceView.js` — `main.js`, `debug.html` y `memories.html` nunca lo importan, así que visitarlos jamás activa el Service Worker ni pone al prototipo viejo (con su detección de backend por `fetch('/api/...')`) bajo su control. Sin `runtimeCaching` ni `navigateFallback`: solo sirve desde cache lo que precacheó al instalar, nunca intercepta `/api/*`.
- **Offline**: al ser 100% cliente (localStorage + IndexedDB), una vez que el Service Worker cacheó el shell de Aurora, todo funciona sin red — validado recargando con `context.setOffline(true)` en Playwright.
- **Instalación**: banner propio (`renderInstallBanner`) — en Android/Chrome usa `beforeinstallprompt` real; en iOS (que no tiene ese evento) muestra las instrucciones manuales de "Compartir → Agregar a inicio".
- **Notificaciones**: ver el punto de arriba y el comentario de cabecera de `notifications.js`.

## Override de desarrollo por query string

`experienceView.js` acepta `?scenario=` para revisar visualmente los 4 `currentMode` sin esperar fechas reales ni depender de persistencia:

- `?scenario=pre_trip`
- `?scenario=day1`
- `?scenario=epilogue`
- `?scenario=memory`

Reglas de este override (deliberadas):
- Vive **solo** en `experienceView.js`, en un bloque claramente delimitado con el comentario `SOLO DESARROLLO`.
- No modifica `storyEngine.js` ni `story-ba2026.json` — solo decide qué `context` (`now`, `chapterStatuses`) se le pasa a `getStoryView`, que funciona exactamente igual con o sin override.
- Cuando está activo, se muestra un banner visible ("Vista de desarrollo — escenario forzado") para que nunca se confunda con el estado real.
- **Cómo quitarlo antes de producción:** borrar el bloque marcado en `experienceView.js` (desde `DEV_SCENARIOS` hasta el comentario de cierre) y dejar `resolveContext` como `() => ({ now: new Date(), chapterStatuses: {} })`.

**Aislamiento:** no depende de React. `render.js` se prueba con Story Packages simulados (`render.test.js`), nunca solo contra el real de Buenos Aires.
