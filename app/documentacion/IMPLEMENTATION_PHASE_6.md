# IMPLEMENTATION_PHASE_6.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Sexta fase de implementación — tarjetas de contenido reales, todavía de solo lectura.
**Estado:** Propuesta — sin código escrito todavía. A la espera de aprobación.

---

## Objetivo de la fase

Que el capítulo visible en `experience.html` deje de mostrar solo título + horario, y muestre el contenido real que ya vive en el Story Package: descripción, categoría, ubicación y links de cada actividad, los lugares relacionados, los photo spots del día, las memorias sugeridas y cualquier colección relacionada. Todo de solo lectura — nada de esto se puede subir, elegir ni guardar todavía.

Esta fase mejora exclusivamente el **capítulo visible en `in_progress`**. `pre_trip`, `epilogue` y `memory_mode` quedan tal como salieron de la Fase 5 — no hay pedido de cambiarlos, y tocarlos igual sería salirse del alcance.

## Alcance

**Incluido en esta fase:**
- Tarjetas de actividad con `description`, `timeWindow`, `category`, `location.name` y sus links (`googleMapsUrl`, `uberDeepLink`, `cabifyDeepLink`, `websiteUrl`).
- El lugar relacionado de cada actividad (`activity.relatedPlaceId` → `placesCatalog`), con su `recommendation`.
- Los `photoSpots` del capítulo visible (filtrados por `relatedChapterId`).
- Las `suggestedMemories` del capítulo visible, como texto — no como algo que se pueda capturar.
- Los ítems de `collections` relacionados con el capítulo visible (filtrados por `relatedChapterId`), solo si existe al menos uno.
- Mantener intactos los botones de progreso de la Fase 5 (`Marcar como iniciado` / `Cerrar capítulo`).

**Explícitamente fuera de esta fase:**
- Subida de fotos/videos, Memory Engine, Album Engine, PWA — confirmado por tus restricciones.
- Cualquier cambio a `pre_trip`, `epilogue`, `memory_mode` o a la lista de "otros capítulos".
- Mapas visuales o embebidos — mostramos el link a Google Maps, no un mapa (`Maps` sigue siendo, según `DOMAIN_MODEL.md`, una capacidad de presentación futura, no de esta fase).
- Cualquier sistema de íconos/imágenes — todo sigue siendo texto, coherente con "no diseño final" de las fases anteriores.

## Decisiones que quiero confirmar antes de programar

1. **Separar la resolución de contenido de la generación de HTML.** `render.js` ya está creciendo — para esta fase agrego `chapterContent.js`, un módulo puro que solo resuelve relaciones dentro del Story Package (qué lugar corresponde a una actividad, qué photo spots y qué ítems de colección pertenecen a este capítulo). `render.js` sigue siendo el único que arma HTML.
2. **Cómo se resuelve "el lugar de una actividad":** primero por `activity.relatedPlaceId` (buscado en `placesCatalog.restaurants` y `placesCatalog.cafes` combinados). Además, cualquier lugar cuyo propio `relatedChapterId` apunte a este capítulo pero que **ninguna actividad haya referenciado**, se muestra aparte en una sección "Lugares para hoy" — para no perder contenido que solo está vinculado por ese lado.
3. **Los links se renderizan como texto corto** ("Mapa", "Uber", "Cabify", "Sitio web"), nunca la URL cruda — y solo aparecen si el dato existe. Ninguna actividad/lugar sin links muestra una sección vacía.
4. **Las secciones opcionales (lugares relacionados, photo spots, colecciones) no se renderizan en absoluto si no hay contenido que mostrar** — nunca un encabezado seguido de "no hay nada", coherente con `03_Design_Principles.md`.
5. **`suggestedMemories` se muestra como una lista simple de sus `prompt`**, sin ícono por tipo (`photo`/`video`/`note`) todavía — es solo lectura, no hace falta distinguir visualmente algo que no se puede accionar.

## Qué archivos crearás

| Archivo | Responsabilidad única |
|---|---|
| `app/src/experience/chapterContent.js` | Resolver, para un capítulo dado, su lugar por actividad, sus photo spots y sus ítems de colección relacionados. Función pura, sin HTML. |
| `app/src/experience/chapterContent.test.js` | Casos de resolución: actividad con lugar, lugar sin actividad que lo referencie, capítulo sin photo spots/colecciones, Story Package sin `placesCatalog`/`collections` en absoluto. |

## Qué archivos modificarás (y por qué)

| Archivo | Cambio | Por qué |
|---|---|---|
| `app/src/experience/render.js` | La tarjeta de actividad se enriquece; se agregan las secciones de lugares/photo spots/colecciones/memorias sugeridas del capítulo visible. | Sigue siendo el único lugar que arma HTML — el contenido nuevo tiene que vivir ahí. |
| `app/src/experience/render.test.js` | Casos nuevos para cada sección agregada, con y sin contenido disponible (para probar la regla de "nunca una sección vacía"). | Sin esto no se puede validar la Decisión 4. |
| `app/src/experience/experience.css` | Estilo mínimo para las tarjetas y las nuevas secciones. | Sin esto, el contenido nuevo se ve sin ninguna jerarquía visual. |

`experienceView.js` no cambia — la firma de `renderExperience` no cambia, solo lo que devuelve para `in_progress`.

## Qué componentes crearás

- **Chapter Content Resolver** (`chapterContent.js`): dado un capítulo y el Story Package completo, devuelve sus relaciones ya resueltas (lugar por actividad, photo spots, ítems de colección) — sin decidir cómo se ven.

## Qué componentes reutilizarás

- Todo lo de las Fases 1, 2, 4 y 5 sin tocar su lógica interna.
- El mismo patrón de función pura + `node:test` con Story Packages simulados.

## Qué riesgos existen

- **`render.js` sigue creciendo como archivo de templates.** Separar `chapterContent.js` ayuda, pero en algún momento (probablemente cuando lleguemos a tarjetas con imágenes reales) va a convertirse en deuda a resolver con un sistema de diseño de verdad — no antes.
- **Actividades sin `location` o sin links** (varias del Story Package real de Buenos Aires no tienen ninguno) — el renderizado tiene que degradar con gracia, sin dejar huecos visuales ni etiquetas vacías.
- **Un lugar podría en teoría ser referenciado por más de una actividad del mismo capítulo** — en ese caso se mostraría repetido, una vez por actividad. No es un problema en el contenido real de Buenos Aires 2026 (no ocurre), así que no lo resuelvo por adelantado.

## Cómo validaremos que la fase quedó terminada

- `npm test` sigue en verde, incluyendo `chapterContent.test.js` y los casos nuevos de `render.test.js`.
- En vivo, con `?scenario=day1`: la tarjeta de "Almuerzo en El Cuartito" muestra su descripción, categoría, dirección y el link a Google Maps; el Día 1 muestra su photo spot (`spot-obelisco`) y su ítem de colección relacionado (`sh-2`, Chocolate Rapanui) — ambos existen en el Story Package real para `chapter-1`, así que son un buen caso de prueba real, no inventado.
- En vivo, con `?scenario=` en un capítulo sin colección relacionada (ej. Día 2), la sección de colecciones no aparece en absoluto.
- Los botones "Marcar como iniciado"/"Cerrar capítulo" de la Fase 5 se siguen viendo y funcionando exactamente igual.
- `git status` no muestra ningún archivo modificado fuera de los cinco de la tabla — `main.js`, `experienceView.js` y todo lo anterior, intactos.
- Cero errores de consola.

## Qué queda pendiente para la siguiente fase

- Imágenes reales (`assets.heroImage`/`galleryImages`) — hoy seguimos sin mostrar ninguna fotografía.
- Un sistema de diseño real que reemplace el CSS ad-hoc acumulado en cuatro fases.
- Memory Engine, para que las memorias sugeridas dejen de ser texto y se puedan capturar de verdad.
- Mapas como capacidad de presentación (fuera del link a Google Maps).

---

*Sin código escrito. A la espera de tu aprobación — en particular de las 5 decisiones de arriba — antes de crear el primer archivo.*
