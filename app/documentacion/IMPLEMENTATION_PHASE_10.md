# IMPLEMENTATION_PHASE_10.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Décima fase de implementación — traducir E-1, E-2 y E-3 a `experience.html`.
**Estado:** Propuesta — sin código escrito todavía. A la espera de aprobación.

---

## Objetivo de la fase

Que `experience.html` deje de mostrar todo el contenido de un capítulo de golpe, y pase a comportarse como diseñamos en E-1/E-2/E-3: una portada que respira, un capítulo que se abre en capas, y recuerdos que se invitan uno a la vez, en su lugar exacto — no como una lista aparte.

**Story Engine y Memory Engine no cambian.** Esta fase es, de principio a fin, una reorganización de Presentation. Ningún archivo de `app/src/story/` ni `app/src/memory/` se toca.

## Alcance

**Incluido:**
- `pre_trip` (E-1): aparición escalonada — fondo, título, pausa, bienvenida, pausa, cuenta regresiva, y recién al final la insinuación suave de los demás capítulos.
- `in_progress` (E-2): un bloque de apertura propio (color del capítulo, título, pausa, frase de apertura) antes que cualquier actividad.
- Captura de recuerdos (E-3): cada recuerdo sugerido con actividad asociada se muestra **pegado a esa actividad**, uno a la vez — no como lista aparte ni como formulario permanente.
- Mantener `?scenario=` funcionando exactamente igual (solo lectura, sin sección de Memorias durante un escenario simulado).
- Mantener los botones de progreso ("Marcar como iniciado"/"Cerrar capítulo") tal como están.

**Explícitamente fuera de esta fase:**
- Fotos, videos, PWA, backend — confirmado por tus restricciones.
- El ritual de cierre de capítulo (E-4) y todo lo posterior — esta fase no toca `renderEpilogue` ni `renderMemoryMode`.

## Decisiones que quiero confirmar antes de programar

1. **El "Hero" de cada capítulo es un color, no una imagen.** No usamos `assets.heroImage` todavía — evita cualquier duda sobre si esos archivos existen de verdad en el repositorio (quedó como pregunta abierta desde la extracción de contenido), y mantiene esta fase estrictamente sin fotos. El color se deriva del `order` del capítulo, ciclando sobre una paleta cálida fija.
2. **Las animaciones de aparición escalonada son 100% CSS** (`@keyframes` + `animation-delay` sobre los elementos que ya existen), sin ningún temporizador en JavaScript. Más simple, más robusto, y respeta `prefers-reduced-motion` de forma nativa sin código extra.
3. **La captura de recuerdos deja de ser una lista + un formulario permanente.** Cada `suggestedMemory` con `relatedActivityId` se adjunta a esa actividad específica, como una invitación inline. Las que no tienen actividad asociada (existe un caso real en el contenido: `mem-4-5`, la "selfie en cualquier cafetería") se muestran al final del capítulo, cada una por separado. Al final de todo agrego **una única pregunta libre** ("¿Algo más de hoy que quieras guardar?"), sin selector de actividad — para no perder la posibilidad de anotar algo no anticipado, sin volver a mostrar varias cosas a la vez.
4. **Una invitación ya usada se transforma en su lugar** — muestra la nota guardada y sus acciones (favorito/guardar aparte) exactamente donde antes estaba la invitación, nunca en una lista aparte. Simplificación aceptada: si alguna vez existiera más de una Memoria para la misma actividad, se muestra solo la más reciente ahí — no se arma una sub-lista, para no romper la calma visual.
5. **La lista de "otros capítulos" se mantiene donde ya está** (al final de la página) — su posición actual ya la saca del momento de apertura; no hace falta ocultarla con lógica nueva, solo confirmar que siga siendo visualmente secundaria.

## Qué archivos modificarás (no se crea ningún archivo nuevo)

| Archivo | Cambio | Por qué |
|---|---|---|
| `app/src/experience/chapterContent.js` | Agregar la resolución de qué `suggestedMemory` corresponde a cada actividad, y cuáles quedan sin actividad asociada. | Es lógica de resolución de contenido — su responsabilidad ya establecida en la Fase 6. |
| `app/src/experience/chapterContent.test.js` | Casos nuevos para esa agrupación. | — |
| `app/src/experience/render.js` | Bloque de apertura del capítulo (E-2); invitaciones inline por actividad en vez de la lista + formulario actual (E-3); animación escalonada de `pre_trip` (E-1, mayormente vía clases que ya existen). | Sigue siendo el único lugar que arma HTML. |
| `app/src/experience/render.test.js` | Cobertura de todo lo anterior: invitación pegada a la actividad correcta, transformación en el lugar al guardar, pregunta libre al final, comportamiento con `interactive:false`. | — |
| `app/src/experience/experienceView.js` | Ajustar el manejo de `create-memory`: el `activityId` ahora viene del propio botón/invitación, no de un `<select>` que ya no existe en ese formato. | Sigue siendo el único archivo con efectos secundarios. |
| `app/src/experience/experience.css` | `@keyframes` de aparición escalonada, colores de Hero por capítulo, estilo de la invitación inline y de su estado "transformado", estilo de la pregunta libre final, `prefers-reduced-motion`. | — |

`main.js`, `storyEngine.js`, `storyProgress.js`, `storyPackage.js`, `progressStore.js` y `memoryStore.js` no se tocan.

## Qué riesgos existen

- **Esto reemplaza el diseño de captura de recuerdos de la Fase 9** (lista + formulario) por el de esta fase (invitaciones inline). No es una regresión — es la traducción de E-3, que ya aprobaste señalando explícitamente que el diseño de la Fase 9 violaba la Regla de la atención.
- **Elegir "el más reciente" cuando hay más de una Memoria para la misma actividad** es una simplificación — no ocurre en el uso normal de hoy, pero si algún día alguien crea dos notas para la misma actividad, la más vieja queda invisible en esta vista (sigue existiendo en `localStorage`, solo no se muestra ahí).
- **El color de Hero por `order` es una decisión estética temporal** — no pretende ser la paleta final de marca, es lo mínimo para que E-2 se sienta ("la aplicación cambia de cara") sin depender de imágenes.
- **Más CSS acumulado** en `experience.css` — sigue sin sistema de diseño real, deuda ya reconocida desde `PROJECT_STATUS_V1.md`.

## Cómo validaremos que la fase quedó terminada

- `npm test` en verde, incluyendo los casos nuevos de `chapterContent.test.js` y `render.test.js`.
- En vivo (reloj simulado, sin `?scenario=`): el Día 1 muestra la invitación de recuerdo pegada específicamente a "Un dulce en el camino: Rapanui" o a "Almuerzo en El Cuartito" (según a qué actividad esté asociada en el contenido real), no en una lista aparte. Al guardarla, se transforma en el lugar, sin saltar a otra parte de la página.
- El Día 4 muestra la invitación sin actividad asociada (`mem-4-5`) al final del capítulo, y la pregunta libre después de esa.
- `?scenario=day1` sigue sin mostrar ninguna invitación ni formulario.
- Los botones de progreso siguen funcionando exactamente igual que en la Fase 5/9.
- `git status` no muestra archivos nuevos, solo los seis modificados — `main.js` y todo `story/`/`memory/` intactos.
- Cero errores de consola.

## Qué queda pendiente para la siguiente fase

- **Fase E-4** (ritual de cierre de capítulo) y su traducción a implementación.
- El "Hero" con imagen real, cuando se resuelva la pregunta de los archivos de imagen.
- Un sistema de diseño real que reemplace los colores/paleta ad-hoc de esta fase.

---

*Sin código escrito. A la espera de tu aprobación — en particular de las 5 decisiones de arriba — antes de tocar el primer archivo.*
