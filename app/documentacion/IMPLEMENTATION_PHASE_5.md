# IMPLEMENTATION_PHASE_5.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Quinta fase de implementación — persistencia mínima de progreso.
**Estado:** Propuesta — sin código escrito todavía. A la espera de aprobación.

---

## Objetivo de la fase

Que `experience.html` deje de depender únicamente de escenarios simulados: que pueda marcar un capítulo como iniciado o finalizado, que eso se guarde en `localStorage`, y que al recargar la página el progreso siga ahí. Nada más — sin backend, sin Memory Engine, sin álbum.

## Por qué no toco `storage.js` (justificación pedida explícitamente)

`storage.js` pertenece a un dominio distinto: persiste el **modelo de contenido legado** (fotos/videos/checklist de `data.js`, sincronizados con MongoDB/Cloudinary vía `app/api`). Según `DOMAIN_MODEL.md`, eso es una mezcla de Memory Engine + Media Storage — un dominio con forma de dato, ciclo de vida y backend completamente distintos al de "progreso de capítulos".

Lo que necesito acá es mucho más angosto: un mapa plano `chapterId → estado`, namespaced por `storyId`, sin medios, sin backend, sin relación con la app actual. Extender `storage.js` para que además haga esto violaría la separación de dominios que ya establecimos, y acoplaría código nuevo a un archivo que — según `TECHNICAL_ARCHITECTURE.md` — está destinado a evolucionar/retirarse junto con el resto del modelo legado. Por eso construyo una capa nueva, pequeña y aislada.

## Alcance

**Incluido en esta fase:**
- Un módulo `progressStore`: cargar, guardar, marcar capítulo como iniciado, marcar capítulo como finalizado — persistido en `localStorage`, namespaced por `storyId`.
- Conectar `experience.html` para que, **fuera de los escenarios de desarrollo**, lea el progreso real guardado en vez de arrancar siempre vacío.
- Botones mínimos ("Marcar como iniciado" / "Cerrar capítulo") en la pantalla del capítulo visible y del epílogo, para que la persistencia sea usable de verdad y no un módulo sin consumidor.

**Explícitamente fuera de esta fase:**
- Cualquier backend — todo vive en el navegador del dispositivo.
- Memory Engine, Album Engine, PWA.
- Que "Cerrar capítulo especial" exija haber respondido sus prompts — hoy no hay dónde guardar esas respuestas; es una simplificación temporal, marcada como riesgo.
- Sincronización entre dispositivos.

## Decisiones que quiero confirmar antes de programar

1. **Storage inyectable, no acceso directo a `window.localStorage`.** Cada función de `progressStore` recibe un objeto con `{ getItem, setItem }` (por defecto, `window.localStorage`). Así se prueba con `node:test` usando un storage simulado en memoria, sin navegador — coherente con "debe poder probarse de forma aislada".
2. **Clave namespaced:** `aurora:progress:${storyId}`. Dos historias nunca se pisan, y el prefijo `aurora:` evita colisión con la clave que ya usa `storage.js` (`ba-trip-memories`).
3. **Regla de escritura:** `markChapterStarted` nunca degrada un capítulo que ya está `completed` (evita que un click viejo retroceda algo ya cerrado). `markChapterCompleted` sí se permite siempre, incluso si nunca pasó por `started` — es una simplificación aceptada para esta fase.
4. **Los botones de acción se ocultan por completo durante un escenario de desarrollo** (`?scenario=`). Agrego un parámetro `interactive` a `renderExperience` (`renderExperience(view, storyPackage, now, { interactive })`) para que `render.js` siga siendo puro (recibe la decisión como dato, no la infiere). Esto evita mezclar progreso real con progreso simulado por accidente — y evita el escenario raro de "aparece un botón pero no hace nada".

## Qué archivos crearás

| Archivo | Responsabilidad única |
|---|---|
| `app/src/story/progressStore/progressStore.js` | Cargar/guardar/marcar el progreso de una historia en un storage inyectable. |
| `app/src/story/progressStore/progressStore.test.js` | Round-trip, namespacing entre historias, la regla de no-degradar, JSON corrupto. |
| `app/src/story/progressStore/README.md` | Responsabilidad / qué no hace / dominios que conoce / dominios que no debe conocer. |

## Qué archivos modificarás (y por qué)

Esta fase, a diferencia de las anteriores, sí toca archivos ya aprobados — porque el objetivo mismo es conectar la persistencia a la pantalla que ya existe:

| Archivo | Cambio | Por qué |
|---|---|---|
| `app/src/experience/experienceView.js` | Leer el progreso real vía `progressStore` cuando no hay `?scenario=`; manejar los clicks de los botones de acción y volver a renderizar. | Es el único archivo con permiso para tener efectos secundarios — sigue siendo el lugar correcto para esto. |
| `app/src/experience/render.js` | Agregar el parámetro `interactive` y el markup de los dos botones de acción (solo cuando corresponde según el estado). | El renderer sigue siendo puro: la decisión de si es interactivo se la pasan, no la calcula. |
| `app/src/experience/render.test.js` | Casos nuevos: el botón correcto aparece según el estado, y no aparece ninguno si `interactive: false`. | Falta cobertura, sin la cual no se puede validar el cambio anterior. |
| `app/src/experience/experience.css` | Estilo mínimo para los botones nuevos. | Sin esto, los botones nuevos quedan sin estilo del todo. |

Son **7 archivos en total** (3 nuevos + 4 modificados) — el conteo más alto hasta ahora, y por eso este plan se detiene a explicarlo antes de tocar nada, como pediste.

## Qué componentes crearás

- **Progress Store**: las cuatro funciones (`loadProgress`, `saveProgress`, `markChapterStarted`, `markChapterCompleted`), sin conocer nada de Story Package ni de Presentation — solo un mapa `chapterId → estado` y dónde vive.

## Qué componentes reutilizarás

- `ChapterStatus` (de `storyProgress.js`) — el Progress Store nunca inventa sus propios strings de estado.
- Todo lo de las Fases 1, 2 y 4, sin tocar su lógica interna (`storyPackage.js`, `storyProgress.js`, `storyEngine.js` quedan exactamente igual).

## Qué riesgos existen

- **`localStorage.setItem` puede fallar** (modo incógnito estricto, cuota llena) y esta fase no lo maneja con un try/catch explícito — se documenta como riesgo conocido, no se resuelve por adelantado.
- **`markChapterCompleted` sin exigir respuestas del epílogo** es una simplificación temporal — cuando exista Memory Engine, cerrar el capítulo especial de verdad va a necesitar más que un click, y este botón habrá que revisarlo.
- **El progreso vive solo en este navegador/dispositivo.** No hay sincronización entre dispositivos — eso es una fase de Synchronization real, más adelante, no esta.
- **Validación en vivo del flujo completo hoy:** como el viaje real empieza el 18 de julio de 2026, hoy (2026-07-07) la página sin `?scenario=` sigue en `pre_trip` y no hay ningún capítulo para marcar. Para probar el flujo real de punta a punta (click → guardar → recargar → seguir ahí) sin esperar al 18 de julio ni usar el override de desarrollo, voy a simular la fecha **del navegador** con Playwright (`page.clock`), no con un parámetro de la URL — así se prueba el código real de producción, no una bifurcación de desarrollo.

## Cómo validaremos que la fase quedó terminada

- `npm test` sigue en verde, incluyendo `progressStore.test.js` y los casos nuevos de `render.test.js`.
- En vivo (con el reloj del navegador simulado a una fecha del viaje, sin `?scenario=`): aparece el botón "Marcar como iniciado", se hace click, la página se actualiza sin recargar, y **recargando la página de verdad** el capítulo sigue marcado — esa persistencia real es el criterio de éxito de esta fase.
- Con `?scenario=day1` activo, no aparece ningún botón de acción.
- `git status` no muestra ningún archivo modificado fuera de la lista de arriba — en particular, `storage.js` y `main.js` intactos.
- Cero errores de consola en la verificación en vivo.

## Qué queda pendiente para la siguiente fase

- Manejo de errores de `localStorage` (cuota, modo incógnito).
- Memory Engine — para que cerrar el epílogo de verdad dependa de haber respondido sus prompts.
- Persistencia más allá de este dispositivo (Synchronization real, con backend).
- Botones y tarjetas más ricas para actividades — sigue pendiente desde la Fase 4.

---

*Sin código escrito. A la espera de tu aprobación — en particular de las 4 decisiones de arriba — antes de crear el primer archivo.*
