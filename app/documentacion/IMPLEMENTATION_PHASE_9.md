# IMPLEMENTATION_PHASE_9.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Novena fase de implementación — Memory Engine dentro de `experience.html`, de verdad.
**Estado:** Propuesta — sin código escrito todavía. A la espera de aprobación.

---

## Objetivo de la fase

Que el capítulo visible en `experience.html` deje de mostrar sus `suggestedMemories` como texto inerte y permita, de verdad, escribir y guardar una nota — con voz de marca, no con el tono funcional de `memories.html`. Integración mínima: una nota por vez, sin fotos ni videos.

## Alcance

**Incluido en esta fase:**
- Un pequeño formulario en el capítulo visible: elegir actividad (opcional) + escribir una nota + guardarla como Memoria.
- Listar las Memorias ya guardadas de ese capítulo.
- Favoritear / dejar de favoritear cada una.
- Ocultarla del listado activo sin eliminarla (`archiveMemory`, ya existente).
- Todo contra `localStorage`, vía `memoryStore.js` (Fase 7) — sin tocarlo.
- `?scenario=` sigue siendo de solo lectura: la sección completa de Memorias no aparece durante un escenario de desarrollo.

**Explícitamente fuera de esta fase:**
- Fotos, videos, Cloudinary, MongoDB, Album Engine — confirmado por tus restricciones.
- Conectar los prompts del epílogo (`type: "creation"`) a Memory Engine — tienen una forma distinta (`creationPrompt`, `resurfaceOnAnniversary`) que merece su propia integración más adelante, no la mezclo acá para mantener esto mínimo.
- Un toggle "mostrar archivadas" dentro de la experiencia real (sí existe en `memories.html`, la herramienta de debug) — acá una Memoria archivada simplemente deja de aparecer; revisar todo lo archivado es trabajo de Album Engine, más adelante.
- Cualquier diálogo de confirmación antes de guardar aparte una Memoria — no existe todavía un componente de diálogo con voz de marca, y usar el `confirm()` nativo del navegador rompería esa voz. Queda como mejora futura.

## Decisiones que quiero confirmar antes de programar

1. **`render.js` sigue sin conocer `memoryStore.js`.** Recibe las Memorias del capítulo ya cargadas, vía un nuevo `options.memories` (mismo mecanismo que ya usa `options.interactive`) — `experienceView.js` es quien las carga y se las pasa. Mantiene la separación puro/impuro que ya usamos en la Fase 6 con `chapterContent.js`.
2. **Copy de los tres botones nuevos** (necesito tu confirmación, es una decisión de voz de marca):
   - Guardar la nota: **"Guardar este recuerdo"**.
   - Favorito: **"♥ Marcar como favorito"** / **"♥ Recuerdo favorito"** según el estado (el corazón está en la lista de emojis permitidos de `06_Brand_Book.md`).
   - Ocultar sin eliminar: acá dudo entre dos opciones y prefiero que elijas — **"Archivar"** (es literalmente el nombre del estado en `07_Business_Rules.md`) o **"Guardar aparte"** (evita la raíz de "Archivo", que está en la lista de palabras prohibidas del Brand Book, aunque ahí se refiere al sustantivo técnico, no a este verbo). Cualquiera de las dos es defendible — decime cuál preferís.
3. **La sección completa de Memorias (formulario + lista) no se renderiza en absoluto si `interactive` es `false`** — ni de solo lectura, directamente no existe. Mismo criterio que ya aplicamos a los botones de progreso en la Fase 5: nada de controles a medias durante un escenario simulado.

## Qué archivos modificarás (no se crea ningún archivo nuevo)

Esta fase es pura integración — toda la lógica de dominio ya existe (`memoryStore.js`, Fase 7). Por eso no hay archivos nuevos, solo estos cuatro, ya aprobados en fases anteriores:

| Archivo | Cambio | Por qué |
|---|---|---|
| `app/src/experience/render.js` | Nueva función que arma el formulario + la lista de Memorias del capítulo visible; se agrega solo dentro de `renderInProgress`. | Sigue siendo el único lugar que arma HTML. |
| `app/src/experience/render.test.js` | Casos nuevos: formulario visible/oculto según `interactive`, lista con y sin Memorias, favorito reflejado en el texto. | Sin esto no se valida la Decisión 3. |
| `app/src/experience/experienceView.js` | Cargar `loadMemories(storyId, undefined, {chapterId filtrado})` para el capítulo visible; manejar el submit del formulario y los nuevos `data-action` (`create-memory`, `favorite-memory`, `archive-memory`); re-renderizar después de cada uno. | Sigue siendo el único archivo con permiso para tener efectos secundarios. |
| `app/src/experience/experience.css` | Estilo mínimo para el formulario y la lista de Memorias. | Sin esto, lo nuevo se ve sin ninguna jerarquía visual. |

`main.js`, `memories.html`, `memoriesView.js` y `memoryStore.js` no se tocan.

## Qué componentes reutilizarás

- Las cuatro funciones de `memoryStore.js` (Fase 7), sin modificarlas.
- El mismo patrón de `data-action` + delegación de eventos que ya usa `experienceView.js` para los botones de progreso (Fase 5) — se extiende, no se duplica.
- `chapter.activities` (ya resuelto por `chapterContent.js`, Fase 6) para poblar el selector de actividad del formulario.

## Qué riesgos existen

- **`interactive:false` ahora oculta una sección entera, no solo un botón** — coherente con la Decisión 3, pero vale la pena tenerlo presente al mirar capturas de un escenario de desarrollo: la ausencia de la sección de Memorias ahí es esperada, no un bug.
- **Sin confirmación antes de "Guardar aparte"** (ver Alcance) — si alguien lo hace por error, el dato sigue recuperable a nivel de datos (`memoryStore.loadMemories(..., {includeArchived:true})`), pero no hay forma de deshacerlo desde la UI real todavía.
- **Duplicación menor**: el selector de actividad del formulario y la resolución de títulos ya existen en espíritu en `chapterContent.js`/`memoriesView.js` — no se abstrae en un helper compartido todavía, para no acoplar `experience` con `memoriesView` (son dos consumidores independientes a propósito).

## Cómo validaremos que la fase quedó terminada

- `npm test` sigue en verde, incluyendo los casos nuevos de `render.test.js`.
- En vivo, con el reloj del navegador simulado (no `?scenario=`, igual que en la Fase 5): en el Día 1 real, escribir una nota asociada a una actividad, guardarla, verla en la lista; favoritearla; guardarla aparte y verla desaparecer de la lista.
- **Recargar la página de verdad** y confirmar que la nota (favorita, guardada aparte) sigue así — no vuelve a aparecer en la lista activa, pero el dato sigue en `localStorage` bajo `aurora:memories:story-ba-2026`.
- Con `?scenario=day1`: confirmar que la sección de Memorias no aparece en absoluto.
- `git status` no muestra ningún archivo modificado fuera de los cuatro de la tabla — `main.js` y todo lo de `memory`/`memoriesView` intactos.
- Cero errores de consola.

## Qué queda pendiente para la siguiente fase

- Conectar los prompts de creación del epílogo a Memory Engine.
- Fotos y videos (Media Storage).
- Album Engine — recién ahí tiene sentido "ver todo lo archivado" y armar la vista de recuerdos completa.

---

*Sin código escrito. A la espera de tu aprobación — en particular de las 3 decisiones de arriba, especialmente el copy del botón de "guardar aparte" — antes de tocar el primer archivo.*
