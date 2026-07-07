# IMPLEMENTATION_PHASE_8.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Octava fase de implementación — vista aislada para probar Memory Engine.
**Estado:** Propuesta — sin código escrito todavía. A la espera de aprobación.

---

## Objetivo de la fase

Una herramienta para crear, listar, favoritear y archivar Memorias de verdad, contra `memoryStore.js` (Fase 7) — para confirmar con los ojos que el módulo funciona, antes de integrarlo a `experience.html`. Es una herramienta de desarrollo, igual en espíritu que `debug.html` (Fase 3), no una pantalla real de Aurora.

## Decisión de clasificación (importante, la confirmo antes que el resto)

**Esta vista es una herramienta de desarrollo, no una pantalla real como `experience.html`.** Por eso:
- CSS inline en el propio HTML, sin archivo aparte — mismo criterio que `debug.html`.
- Copy directo y funcional, sin necesidad de voz de marca — mismo criterio que `debug.html` (que si dice "Marcar como Iniciado" en un botón, no "¿Listo para empezar?").
- No respeta el orden narrativo de capítulos (no filtra por si un capítulo está disponible o no) — es una herramienta para probar el motor libremente, no la experiencia real.

Si preferís que esta vista ya tenga voz de marca porque la ves como un paso hacia la UI real, decímelo — no lo asumo por mi cuenta.

## Alcance

**Incluido en esta fase:**
- `app/memories.html`, página aislada nueva.
- Cargar `story-ba2026.json` (mismo patrón de `debug.html`/`experience.html`).
- Selector de capítulo (todos, incluido el epílogo) y, dentro de él, selector de actividad — con una opción explícita "(ninguna)", porque `activityId` es opcional.
- Crear una nota como Memoria (`createNoteMemory`).
- Listar las Memorias de la historia (`loadMemories`).
- Marcar/desmarcar favorita por Memoria (`toggleFavorite`).
- Archivar una Memoria (`archiveMemory`).
- Un checkbox "Mostrar archivadas" que vuelve a consultar con `{ includeArchived: true }`.
- Todo contra `localStorage` real — sin simular fecha ni progreso, porque Memory Engine no depende de ninguno de los dos.

**Explícitamente fuera de esta fase (confirmado por tus restricciones):**
- Subida de fotos/videos, Cloudinary, MongoDB.
- Cualquier integración con `experience.html` o `main.js`.
- Cualquier regla de "solo se puede crear una memoria si el capítulo está disponible" — eso es una decisión de la experiencia real, no de esta herramienta de prueba.

## Qué archivos crearás

| Archivo | Responsabilidad única |
|---|---|
| `app/memories.html` | Estructura de la página: selector de capítulo/actividad, formulario de nota, lista de memorias. Sin estilo de marca. |
| `app/src/memoriesView/memoriesView.js` | Único archivo que toca `document`: conecta los controles con `memoryStore.js` y vuelve a renderizar la lista después de cada acción. |
| `app/src/memoriesView/README.md` | Deja explícito que es una herramienta de desarrollo, no el inicio de una UI real — mismo criterio que `app/src/debug/README.md`. |

Carpeta nueva (`memoriesView`), separada de `app/src/memory/` (el dominio) — mismo patrón que ya existe entre `app/src/story/` (dominio) y `app/src/debug/`/`app/src/experience/` (consumidores).

## Qué archivos modificarás

Ninguno.

## Qué componentes crearás

- **Memories Debug View**: JS plano sin framework, igual que `debugView.js` — lee los controles, llama a `memoryStore.js`, vuelve a pintar la lista.

## Qué componentes reutilizarás

- `loadStoryPackage`, `story-ba2026.json` (para poblar capítulos/actividades).
- Las cuatro funciones de `memoryStore.js`, sin modificarlas.
- El mismo patrón de página aislada con `<script type="module">` de `debug.html`/`experience.html`.

## Qué riesgos existen

- **No hay pruebas automatizadas nuevas.** `memoriesView.js` es código de conexión (como `debugView.js`/`experienceView.js`), no lógica de dominio — su corrección se valida en vivo, no con `node:test`. La lógica que sí importa (`memoryStore.js`) ya tiene sus 9 pruebas de la Fase 7, sin cambios.
- **Sin protección contra crear una nota vacía** más allá de un chequeo simple en el botón — no es un caso crítico en una herramienta interna.
- **Los ids de actividad y capítulo se muestran resueltos a su título** en la lista, pero si algún día un capítulo cambia de título, memorias viejas seguirían mostrando el título actual (se resuelve en el momento de listar, no se guarda una copia) — comportamiento correcto y esperado, lo dejo explícito para que no se lea como bug.

## Cómo validaremos que la fase quedó terminada

- En vivo, con `npm run dev`, `/memories.html`: crear una nota asociada a un capítulo y una actividad, y verla aparecer en la lista.
- Marcar como favorita y ver el cambio reflejado sin recargar.
- Archivar y confirmar que desaparece de la lista por defecto, y que reaparece marcando "Mostrar archivadas".
- **Recargar la página de verdad** y confirmar que todo (la nota, el favorito, el archivado) sigue ahí — la misma prueba de persistencia real que hicimos en la Fase 5, ahora para Memorias.
- `git status` no muestra ningún archivo modificado — solo los tres nuevos.
- `npm test` sigue en 60/60 (esta fase no agrega lógica de dominio nueva).
- Cero errores de consola.

## Qué queda pendiente para la siguiente fase

- Integrar Memory Engine a `experience.html` de verdad — que las `suggestedMemories` de un capítulo se puedan capturar ahí mismo, no en una herramienta aparte.
- Soporte de fotos/videos.
- Album Engine, una vez que haya Memorias reales que ensamblar.

---

*Sin código escrito. A la espera de tu aprobación — en particular de la clasificación como herramienta de desarrollo — antes de crear el primer archivo.*
