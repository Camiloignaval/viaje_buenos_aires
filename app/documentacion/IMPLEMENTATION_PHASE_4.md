# IMPLEMENTATION_PHASE_4.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Cuarta fase de implementación — la primera pantalla real de Aurora, aislada.
**Estado:** Propuesta — sin código escrito todavía. A la espera de aprobación.

---

## Objetivo de la fase

Construir la primera pantalla que se **vea y suene** como Aurora — no un volcado de JSON como `debug.html`, sino texto y estructura reales, con la voz de marca — pero todavía completamente aislada de `main.js` y de la app actual. Es un escaparate del motor, no todavía "la aplicación".

## Alcance

**Incluido en esta fase:**
- Una página nueva, `app/experience.html`, con su propio punto de entrada.
- Carga de `story-ba2026.json` a través de `loadStoryPackage`, y ejecución de `getStoryView` con la **fecha real** del sistema (no simulada — esta ya no es una herramienta de debug).
- Renderizado según `currentMode`: `pre_trip`, `in_progress`, `epilogue`, `memory_mode`.
- Mostrar `visibleChapter` cuando exista, con su copy de apertura y sus actividades (en forma simple).
- Mostrar los demás capítulos regulares de forma "bonita pero simple" — sin revelar su contenido, solo su estado, con vocabulario de marca (nunca "Bloqueado", nunca un candado con tono de error).

**Explícitamente fuera de esta fase (confirmado por tus restricciones):**
- Memory Engine, Album Engine, PWA/manifest/service worker.
- Tarjetas ricas de actividades/lugares (fotos, links de mapa/Uber, presupuesto, checklist) — se muestran solo título y horario. Es una reducción deliberada del contenido real disponible en el Story Package, para no convertir esta fase en "terminar la app". Si preferís que esta fase sí incluya las tarjetas completas, lo ajusto antes de programar.
- Cualquier interacción real con los prompts del epílogo (reflexión, carta, etc.) — se muestran como texto, no como formularios funcionales, porque todavía no existe dónde guardar una respuesta.
- Autenticación / Story Access — la página es de acceso abierto en desarrollo, igual que `debug.html`.

## Decisiones que quiero confirmar antes de programar

1. **`render.js` es una función pura que devuelve HTML como texto** (`renderExperience(view, storyPackage) → string`), sin tocar el DOM. Esto permite probar los 4 `currentMode` con `node:test`, sin necesitar un navegador — coherente con la regla de "debe poder probarse de forma aislada". Un archivo aparte, mínimo, se encarga de inyectar ese string en la página real.
2. **Sin fecha simulada en esta página.** A diferencia de `debug.html`, `experience.html` usa siempre `new Date()` real y `chapterStatuses: {}` (todavía no hay persistencia). Esto significa que, probada en vivo **hoy** (2026-07-07), la página solo puede mostrar honestamente el modo `pre_trip` — los otros tres (`in_progress`, `epilogue`, `memory_mode`) los vamos a validar con pruebas automatizadas sobre `renderExperience()` usando `StoryView` simulados, no navegando la página real, porque hasta que exista persistencia no hay forma legítima de alcanzarlos en vivo. Si preferís que la página acepte un override temporal por query string para poder verla en los 4 modos hoy mismo, decímelo — no lo agrego por defecto porque abriría una puerta trasera en una página que ya no es de debug.
3. **Micro-copy para los estados de capítulo**, siguiendo `06_Brand_Book.md` (nunca "Bloqueado/Disponible/Completado" tal cual):
   - `locked` → *"Todavía no"*
   - `available` → *"Hoy"*
   - `started` → *"En curso"*
   - `completed` → *"Vivido"*
4. **La cuenta regresiva en `pre_trip` sí se muestra** (días hasta `nextUnlock.date`) — es la única excepción ya documentada en `08_State_machine.md`/`02_User_Experience.md`: la cuenta regresiva al inicio del viaje está permitida; lo que nunca se muestra es progreso o porcentaje una vez el viaje empezó.

## Qué archivos crearás

| Archivo | Responsabilidad única |
|---|---|
| `app/experience.html` | Shell de la página: monta `#app`, carga el CSS y el módulo de entrada. |
| `app/src/experience/render.js` | Traducir un `StoryView` + Story Package a HTML (string), un caso por `currentMode`. Función pura, sin DOM. |
| `app/src/experience/render.test.js` | Pruebas de los 4 `currentMode` + los dos sub-estados del epílogo (locked/available), con `StoryView` simulados. |
| `app/src/experience/experienceView.js` | El único archivo que toca `document`: carga el Story Package real, llama a `getStoryView` con la fecha real, e inyecta el resultado de `render.js`. |
| `app/src/experience/experience.css` | Estilos mínimos, aislados — sin relación con `style.css` de la app actual. |
| `app/src/experience/README.md` | Responsabilidad / qué no hace / dominios que conoce / dominios que no debe conocer. |

Son 6 archivos nuevos. Si preferís mantenerlo en 5, puedo poner el CSS inline dentro de `experience.html` en vez de un archivo aparte — decime cuál preferís.

## Qué archivos modificarás

Ninguno.

## Qué componentes crearás

- **Experience Renderer** (`render.js`): dado un `StoryView`, decide qué bloque de contenido corresponde (`pre_trip` / `in_progress` / `epilogue` / `memory_mode`) y arma el HTML con la voz de marca, usando `baseCopy` y el `visibleChapter` cuando existe.
- **Experience Bootstrap** (`experienceView.js`): la única pieza con efectos secundarios — carga datos, ejecuta el motor, pinta la página.

## Qué componentes reutilizarás

- `loadStoryPackage`, `getStoryView`, `ChapterStatus`, `StoryMode` y `story-ba2026.json`, todos sin modificar.
- El mismo patrón de HTML plano + módulo JS sin framework que ya usa `main.js` y `debug.html` — coherente con "no depender de React".

## Qué riesgos existen

- **Sin persistencia, esta página vive congelada en `pre_trip` hasta el 18 de julio de 2026 en la realidad.** Es honesto y esperado, pero significa que no hay forma de "demostrarle a alguien" los otros tres modos en vivo hasta la fase de Synchronization — se documenta para que no se lea como una falla.
- **HTML armado con template strings** (mismo patrón que `main.js`): sin riesgo de XSS porque todo el contenido viene del Story Package local y confiable, no de input de usuario — pero es una convención a mantener, no a repetir sin pensar si en el futuro entra contenido no confiable.
- **Micro-copy de estados** ("Todavía no", "Hoy", "En curso", "Vivido") es una primera propuesta de tono — puede necesitar ajuste editorial tuyo antes de considerarse definitiva.
- **Tokens visuales (`experience.css`) aislados y ad-hoc** — no intentan ser el sistema de diseño final de Aurora; cuando exista uno real, esta hoja de estilos se reemplaza, no se extiende.

## Cómo validaremos que la fase quedó terminada

- `npm test` sigue en verde, incluyendo `render.test.js` con los 4 `currentMode` y ambos sub-estados del epílogo.
- En vivo, con `npm run dev`, `/experience.html` carga hoy y muestra el modo `pre_trip` con la cuenta regresiva correcta, sin errores de consola (verificado con navegador real, como en la Fase 3).
- `git status` no muestra ningún archivo modificado — solo los nuevos.
- `main.js` y el resto de la app siguen exactamente iguales.
- Cero menciones a nombres propios o fechas de julio dentro de `render.js`/`experienceView.js` — todo eso vive únicamente en `story-ba2026.json`.

## Qué queda pendiente para la siguiente fase

- Tarjetas reales de actividades/lugares (fotos, links, presupuesto, checklist) — hoy reducidas a título + horario.
- Memory Engine, para que los prompts del epílogo dejen de ser texto y se puedan responder de verdad.
- Persistencia del progreso — recién ahí esta página podrá alcanzar honestamente `in_progress` con capítulos completados, y `epilogue`/`memory_mode` en vivo.
- Unificación de un sistema de diseño real, una vez que exista.

---

*Sin código escrito. A la espera de tu aprobación — en particular de las 4 decisiones de arriba — antes de crear el primer archivo.*
