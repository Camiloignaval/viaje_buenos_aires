# experience

**Qué es:** la primera pantalla real de Aurora — usa la voz de marca y el Story Engine de verdad, pero sigue completamente aislada de `main.js` y de la app actual. Se abre en `/experience.html`.

**Responsabilidad de cada archivo:**
- `render.js` — función pura: `StoryView` + Story Package + `now` + `{interactive}` → HTML. Sin DOM, sin reloj propio, un caso por `currentMode`.
- `chapterContent.js` — función pura: dado un capítulo y el Story Package, resuelve sus relaciones (lugar de cada actividad, photo spots, ítems de colección relacionados). No arma HTML — `render.js` es quien lo consume.
- `experienceView.js` — el único archivo que toca `document`: carga `story-ba2026.json`, ejecuta `getStoryView`, lee/escribe progreso vía `progressStore`, maneja los clicks de los botones de acción e inyecta el resultado de `render.js`.
- `experience.css` — estilos mínimos y aislados, sin relación con `style.css` de la app actual.

**Qué NO hace:**
- No implementa Memory Engine, Album Engine ni PWA.
- No permite responder los prompts del epílogo — se muestran como texto, no como formulario.
- No persiste Memorias reales — solo el estado de capítulos (`iniciado`/`finalizado`), vía `progressStore` (ver Fase 5).
- Las `suggestedMemories` de un capítulo se muestran como texto plano — no hay forma de capturarlas todavía.

**Dominios que conoce:** Story Package y el resultado de Story Engine (`StoryView`), solo para transformarlos en HTML.

**Dominios que no debe conocer:** Memory Engine, Notification Engine, Story Access, Synchronization. No sabe cómo se guarda nada.

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
