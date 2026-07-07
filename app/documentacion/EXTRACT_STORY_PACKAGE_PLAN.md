# EXTRACT_STORY_PACKAGE_PLAN.md

**Autor:** Lead Software Architect
**Alcance:** Plan de extracción del contenido real de Buenos Aires 2026 hacia un Story Package conforme a `STORY_PACKAGE_SCHEMA_v1.3.md`.
**Estado:** Planificación. Sin código, sin cambios al repositorio, sin migración ejecutada.

---

## 0. Principio rector

Todo lo que sigue es un plan de **datos**, no de motor. Ninguna fecha, nombre propio o lugar de Buenos Aires debe terminar escrito en el código del motor — todo termina en el documento del Story Package. Buenos Aires 2026 es la primera instancia; el plan se valida en la medida en que **cualquier otra ciudad podría atravesar los mismos doce pasos sin tocar una sola regla de este documento.**

Para armar este plan leí el contenido real (no un resumen) de `app/src/data.js` y las secciones relevantes de `index.html`. Esto cambia algunas conclusiones del análisis anterior — en particular, **el desayuno del hotel ya está bien resuelto en el contenido actual**, y **el capítulo especial del 22 de julio no existe en ningún archivo hoy** (más detalle en §5).

**Actualización (v1.3):** `shoppingGuide` fue rediseñado y generalizado a `CuratedCollections` (`collections[]`, `STORY_PACKAGE_SCHEMA_v1.3.md` §11) — cualquier historia puede tener múltiples colecciones curadas, no solo souvenirs. Buenos Aires 2026 usa una sola colección: **Souvenirs**. Además, la ejecución del orden de §7 ya se realizó — el resultado real vive en `STORY_PACKAGE_BA2026.md`.

**Corrección encontrada durante la ejecución:** `TRIP_BUDGET` no es un rango min/max por categoría como se describió inicialmente en §4 — el segundo número de cada fila (540.000) es el mismo en las tres categorías porque es el **total del viaje repetido** (usado por la barra de progreso de la UI), no un máximo individual. Los tres valores reales son $400.000 (comidas y salidas) + $96.000 (cafés/medialunas/helados) + $44.000 (Uber/Cabify) = $540.000, que coincide exactamente con el acumulado real del viaje. No hubo entonces ninguna decisión de "rango vs. valor único" que tomar — el dato ya era un valor único por categoría.

**Segunda corrección:** `CHECKLIST_ITEMS` de `data.js` tiene **47 ítems**, no 38 como se indicó en §1 (5 documentos + 10 equipaje + 7 apps + 4 dinero + 13 lugares + 8 momentos = 47).

---

## 1. Inventario de fuentes actuales

Hay **dos copias del mismo contenido, ya divergentes entre sí**:

| Contenido | En `app/src/data.js` | En `index.html` (legacy) | ¿Coinciden? |
|---|---|---|---|
| Checklist | `CHECKLIST_ITEMS`: 47 ítems, categorizados (línea 13-72) | `CHECKLIST`: 18 strings planas, sin categoría (línea 2593-2599) | **No** — el legacy tiene menos de la mitad de los ítems y perdió las categorías. |
| Álbum de fotos | `ALBUM_PHOTOS`: 10 objetos con `day`, `horario`, `consejo` (línea 76-167) | `ALBUM_PHOTOS`: 10 arrays posicionales, sin `day`, con un campo extra "tipo de foto" (línea 2614-2625) | Parcialmente — mismo contenido narrativo, estructura distinta, y el legacy no sabe a qué día pertenece cada foto. |
| Videos | `VIDEO_MOMENTS`: 10 objetos con `day` (línea 171-182) | `VIDEO_MOMENTS`: 10 strings planas, sin `day` (línea 2601-2612) | Mismo contenido, el legacy pierde la asociación a día. |
| Apps recomendadas | `CHECKLIST_ITEMS` categoría `apps`: 7 ítems (línea 34-40) | `APPS`: 7 entradas con ícono + descripción (línea 2627-2635) | Sí, contenido equivalente. |
| Restaurantes/cafeterías | No existen en `data.js` | Narrados como secciones completas del itinerario, con `rating`, dirección, recomendación de pedido, y links reales de Google Maps/Uber ya embebidos como `<a href>` (línea 987-2052) | Solo existen acá — es la fuente más rica y la que hay que preservar. |
| Presupuesto | No existe en `data.js` | `TRIP_BUDGET`: 3 categorías con rango min/max en **CLP** (línea 2637-2641) | Solo acá. |
| Photo spots | No existe en `data.js` | `PHOTO_SPOTS`: 6 lugares con tip fotográfico (línea 2643-2650) | Solo acá. |
| Souvenirs | No existe en `data.js` | `SOUVENIRS`: 20 ítems con precio en CLP (línea 2652-2673) | Solo acá — **ahora mapea a `collections[0].items[]`, colección "Souvenirs" (schema v1.3, §11)**. |
| Navegación | No existe en `data.js` | `CHAPTERS`: 11 ítems con anchors (línea 2675-2687) | Solo acá — **se descarta por completo**, ya está resuelto que la navegación oficial es la de `12_Experience_Blueprint.md`. |
| Fechas del viaje | No existe en `data.js` | `TRIP_START = '2026-07-18'`, `TRIP_END = '2026-07-21'` (línea 2959-2960) | Solo acá. **Cuatro días, sin ningún quinto día de cumpleaños.** |
| Dedicatoria / carta final | No existe en `data.js` | Texto personal completo, en primera persona, nombrando a Kari y Camilo (línea ~645-698 y ~2396-2403) | Solo acá. |

**Decisión que este plan asume (a confirmar):** `data.js` es la fuente canónica donde ambas copias divergen en estructura (checklist, álbum, videos), porque ya tiene la forma más cercana al contrato. El contenido exclusivo de `index.html` (restaurantes, presupuesto, photo spots, souvenirs, copy) se extrae desde ahí porque no tiene otra fuente.

---

## 2. Mapeo contenido actual → campo del Story Package v1.2

| Contenido actual | Origen | Campo destino |
|---|---|---|
| `TRIP_START`, `TRIP_END` | `index.html:2959-2960` | `metadata.travelDates.start` / `.end` |
| Nombres en dedicatoria/carta | `index.html` (dedicatoria, carta final) | `metadata.travelerNames` |
| — | (decisión de producto ya tomada) | `storyMood.primary = "romantic"` |
| Secciones "Día 1"–"Día 4" | `index.html:896, 1197, 1570, 1899` | `chapters[0..3]` (`order` 1 a 4) |
| Ítems de timeline por día (ej. "Almuerzo en El Cuartito", "Cena en parrilla") | Timelines de cada día (ej. línea 928, 931, 1225-1238) | `chapters[n].activities[]` |
| Restaurantes/cafeterías narrados (El Cuartito, La Estancia Asador Criollo, La Cabrera, Cabaña Las Lilas, Desnivel, Florería Atlántico, Las Violetas, El Correo) | Secciones de cada día | `placesCatalog.restaurants[]` / `.cafes[]`, referenciados desde la actividad correspondiente vía `relatedPlaceId` |
| Texto de `specialty`/descripción de cada lugar (ej. *"Pizzería histórica de 1934, un clásico absoluto porteño..."*) | Mismas secciones | `recommendation` de cada `Place` — **ya es cualitativo, no requiere reescritura**, solo se descarta el número de estrellas que lo acompaña. |
| Links `<a href="google maps...">` y `<a href="uber...">` ya presentes en el HTML | Botones de cada lugar (ej. línea 1959-1961) | `location.googleMapsUrl` / `location.uberDeepLink` — **ya existen como URLs reales, es extracción literal, no invención.** |
| `ALBUM_PHOTOS` (10 fotos con día, horario, consejo) | `data.js:76-167` | `chapters[n].suggestedMemories[]`, tipo `"photo"`, usando `consejo` como base del `prompt` |
| `VIDEO_MOMENTS` (10 videos con día) | `data.js:171-182` | `chapters[n].suggestedMemories[]`, tipo `"video"` |
| `PHOTO_SPOTS` | `index.html:2643-2650` | `photoSpots[]` |
| `CHECKLIST_ITEMS` (38, categorizados) | `data.js:13-72` | `checklist[]`, preservando `category` |
| `TRIP_BUDGET` (3 categorías, rango min/max) | `index.html:2637-2641` | `budget.categories[]` — **requiere decisión: el schema solo admite `estimatedAmount` único, no un rango** (ver §5). |
| `SOUVENIRS` (20 ítems: `[icono, nombre, precio, dónde comprar]`) | `index.html:2652-2673` | `collections[0].items[]`, colección `"Souvenirs"` — `name` y `suggestedWhereToBuy` son extracción literal; `estimatedPrice`/`currency` ya vienen en CLP casi siempre literales (algunos como `"Variable"`, que se preserva tal cual en el campo de texto libre). `category` **no existe como campo propio hoy** — se deriva del ícono, usando una lista cerrada de 6 categorías (gastronomía, tradición, bebida, moda, colección, recuerdo) para evitar categorización inconsistente. `relatedChapterId` se infiere de las menciones entre paréntesis que ya trae el texto (ej. "Rapanui, Av. Corrientes (Día 1)" → `chapter-1`; "Mercado de San Telmo (Día 3)" → `chapter-3`; "El Ateneo Grand Splendid (Día 4)" → `chapter-4`). |
| Dedicatoria / mensajes de apertura y cierre de día / carta final | `index.html` (dedicatoria, carta final, cierres de cada día) | `baseCopy.welcomeMessage`, `.dailyOpenTemplate`, `.dailyCloseTemplate`, `.finalLetter` |
| Meta description / og:description | `index.html:7,10` | Insumo para `invitationContent.qrLandingCopy` (requiere reescritura, no es una extracción literal — ver §5) |
| Rutas de imágenes (`images/dia1-cuartito.jpg`, `images/hotel.jpg`, etc.) | Todo el documento | `assets.heroImage` / `chapters[n].assets.heroImage` — **sujeto a confirmar que los archivos físicos existen** (no verificado en este plan). |

---

## 3. Qué se descarta por completo

- **El sistema de `rating`** (`.rating`, los 6 puntajes numéricos: El Cuartito 4.3, La Estancia Asador Criollo 4.4, La Cabrera 4.6, Cabaña Las Lilas 4.6, Desnivel 4.3, Florería Atlántico 4.7). Decisión de producto ya tomada — ninguno de estos valores pasa al Story Package.
- **`CHAPTERS`** (navegación de 11 ítems de `index.html`). La navegación oficial es la de `12_Experience_Blueprint.md`, no vive en el Story Package de todos modos (es de Presentation, no de contenido).
- **La versión corta del checklist** (`CHECKLIST` de `index.html`, 18 ítems sin categoría) — se descarta a favor de `CHECKLIST_ITEMS` de `data.js`, que es estrictamente más completa.
- **Íconos y colores de UI** (`ic-utensils`, `var(--primary)`, etc. de `TRIP_BUDGET`, `APPS`, `PHOTO_SPOTS`). Son decisiones de Presentation, no de contenido — no tienen lugar en el contrato.

## 4. Qué se debe corregir respecto al contenido actual

- **Moneda del presupuesto:** el ejemplo del schema v1.1 usa `"currency": "ARS"` a modo ilustrativo, pero el contenido real de Buenos Aires 2026 está expresado en **CLP** en todos lados (`TRIP_BUDGET`, `SOUVENIRS`, y cada `order-detail` de restaurante dice explícitamente "CLP"). Al extraer, `budget.currency` debe ser `"CLP"`, no `"ARS"`.
- ~~Rango de presupuesto → valor único~~ **Resuelto:** no existía tal rango — ver la corrección en la actualización de este documento. `budget.categories[].estimatedAmount` toma directamente el valor real de cada categoría ($400.000 / $96.000 / $44.000 CLP).
- **Ninguna otra corrección de contenido es necesaria** — a diferencia de lo que asumí como ejemplo ilustrativo en `STORY_PACKAGE_SCHEMA.md` (v1.0), el contenido real **ya resuelve correctamente el desayuno del hotel**: Día 1 no tiene desayuno de hotel (es el día de llegada, la primera comida es el almuerzo en El Cuartito), Día 2 y Día 3 sí lo tienen ("Desayuno en el hotel", línea 1244 y 1615, con la aclaración textual *"El Cyan Américas Towers incluye desayuno"*, línea 1248), y Día 4 tiene un desayuno especial deliberadamente distinto en Las Violetas, presentado como una excepción consciente ("Los otros días desayunamos en el hotel — hoy, el último, vale la pena romper la rutina", línea 1954). Este matiz debe preservarse tal cual al extraer las actividades de cada día — no simplificarlo a "todos los días desayuno de hotel" ni a "todos los días medialunas".
- **Recomendación principal de restaurante:** `La Cabrera` (Día 2, almuerzo) debe quedar marcada como la recomendación gastronómica principal del Story Package — es, en el contenido actual, la entrada con más detalle narrativo y el rating más alto antes de eliminarlo (4.6). `Don Julio` no existe en ningún archivo del proyecto hoy — no hay nada que corregir en el código, pero se deja registrada esta regla de contenido para cuando se enriquezca o cure el Story Package (manualmente o vía Story Authoring a futuro): **no se agrega ni se sugiere Don Julio como recomendación principal**, aunque sea un lugar frecuentemente sugerido por fuentes genéricas de Buenos Aires.

## 5. Qué falta y debe completarse manualmente (no es extracción, es contenido nuevo)

- **El capítulo especial del 22 de julio no existe en ningún archivo actual.** `TRIP_START`/`TRIP_END` delimitan un viaje de exactamente 4 días (18 al 21 de julio); el cumpleaños se menciona como el motivo emocional del viaje completo, pero nunca como un quinto día separado con fecha propia, sin mapa, sin itinerario. Esto es exactamente lo que `07_Business_Rules.md`/`08_State_machine.md` describen y lo que confirmaste que debe mantenerse — pero **hay que escribirlo de cero** como `specialChapter`, no extraerlo. Es el ítem de mayor esfuerzo de contenido nuevo de todo este plan.
- **`invitationContent`** no tiene fuente real: no existe hoy ningún flujo de invitación/QR en el código (Story Access tampoco está implementado). El `meta description`/`og:description` de `index.html` puede inspirar el tono, pero `invitationTitle`, `invitationMessage`, `qrLandingCopy` e `installPromptCopy` deben redactarse nuevos.
- **`lockedPreviewImage`** (por historia y por capítulo) no existe como concepto en el contenido actual — hoy todo el contenido está siempre visible, no hay noción de "imagen que se muestra mientras algo está bloqueado". Se necesita definir al menos una imagen genérica compartida para v1, o encargar una por capítulo.
- **`collections[].items[].category`** no es una extracción directa — el contenido actual solo tiene un ícono decorativo por souvenir, no una categoría de negocio. Se resolvió con una lista cerrada de 6 categorías (gastronomía, tradición, bebida, moda, colección, recuerdo) aplicada a los 20 ítems, para que no queden categorías inventadas ad-hoc.
- **Tensión de copy personalizado vs. copy neutral:** el principio del schema dice que `baseCopy` es "neutral, sin mood aplicado" — pero todo el copy real de Buenos Aires 2026 ya está escrito en primera persona, nombrando a Kari y Camilo. Como el motor de aplicación de tono por Story Mood es una pieza de **Authoring futuro** (no se construye en v1, según `TECHNICAL_ARCHITECTURE.md`), la solución pragmática para esta instancia es aceptar que `baseCopy` de `story-ba-2026` ya venga en voz "romantic" final, sin capa intermedia. Lo dejo documentado como **deuda técnica consciente**, no como violación silenciosa: el día que exista una segunda historia con otro mood, este approach debe revisarse.
- **Interpolación de nombres en el copy:** el schema no define si `baseCopy` admite variables (ej. `{{travelerNames}}`) o si cada instancia escribe el nombre en texto plano. Hoy no hay motor de plantillas. Para v1 se asume texto plano (nombres ya escritos en el copy), y se deja anotado como posible refinamiento futuro del schema, no una decisión a tomar ahora.

## 6. Riesgos de migración

- **Dos fuentes divergentes** (`data.js` vs. `index.html`) pueden esconder pérdida de contenido si se copia desde la fuente equivocada — en particular, el checklist de 18 ítems del legacy es una versión desactualizada del de 38 ítems de `data.js`.
- **El capítulo especial es contenido nuevo, no una extracción** — si se trata como un simple paso de migración de datos, se subestima el esfuerzo real (requiere decisiones de producto, no solo trabajo técnico).
- **Confusión de moneda** (ARS vs. CLP) si se extrae mecánicamente sin revisar el contexto — todo el contenido real está en CLP.
- ~~Categorización inconsistente en `collections`~~ **Mitigado:** se fijó una lista cerrada de 6 categorías antes de categorizar los 20 ítems.
- **Imágenes no verificadas:** las rutas (`images/dia1-cuartito.jpg`, etc.) se asumen válidas porque aparecen en el HTML, pero no se confirmó en este plan que los archivos físicos existan en el repositorio.
- **Filtración del vocabulario personal a la capa de motor:** si el copy con nombres propios se trata descuidadamente como "el copy genérico", alguien podría terminar escribiendo lógica condicional sobre "Kari" en el motor para casos especiales — exactamente lo que el Story Package debe evitar.

## 7. Orden recomendado de migración

1. `metadata` + `storyMood` + `unlockRulesDefault` — la base fija primero.
2. Esqueleto de los 4 `chapters` (`id`, `order`, `title`), sin contenido interno todavía.
3. `activities` + `suggestedMemories` por capítulo, extraídas de los timelines y de `ALBUM_PHOTOS`/`VIDEO_MOMENTS`.
4. `placesCatalog` (restaurantes y cafeterías), con `recommendation` reemplazando cada rating, y los links de Google Maps/Uber ya existentes en el HTML.
5. `photoSpots`, extraído tal cual de `PHOTO_SPOTS`.
6. `collections` (colección `"Souvenirs"`), extraída de `SOUVENIRS` (20 ítems) — categorizada con la lista cerrada de 6 categorías, con `relatedChapterId` derivado de las menciones entre paréntesis ya existentes en el texto.
7. `checklist`, usando `CHECKLIST_ITEMS` de `data.js` como fuente única (47 ítems; se descarta la versión corta del legacy).
8. `budget`, con `currency: "CLP"` y los tres valores reales de `TRIP_BUDGET` (sin rango que resolver).
9. `baseCopy`, aceptando conscientemente que viene en voz personalizada (deuda técnica anotada en §5).
10. `assets`, mapeando las rutas de imágenes existentes — condicionado a confirmar que los archivos existen.
11. `invitationContent` — redacción nueva.
12. `specialChapter` del 22 de julio — redacción nueva, en conjunto con Camilo, sin ningún prompt de calificación.
13. Pasada final de validación contra el checklist de §8.

## 8. Checklist de validación final

- [ ] Ningún campo del Story Package contiene un rating/puntaje numérico.
- [ ] `budget.currency` es `"CLP"`.
- [ ] Día 1 no incluye desayuno de hotel; Día 2 y Día 3 sí; Día 4 tiene su desayuno especial en Las Violetas presentado como excepción, no como regla.
- [ ] La Cabrera figura como la recomendación gastronómica principal; "Don Julio" no aparece en ningún campo del documento.
- [ ] Existe `specialChapter` con fecha propia posterior a `travelDates.end`, `breaksNarrativeRules` completo, y `prompts` sin ninguna entrada de calificación.
- [ ] Ningún archivo de motor (fuera del propio documento del Story Package) contiene una fecha o un nombre propio hardcodeado.
- [ ] Todos los `id` del documento son únicos.
- [ ] Todo `relatedPlaceId` usado en una actividad existe realmente en `placesCatalog`.
- [ ] `collections` contiene la colección "Souvenirs" con los 20 ítems, cada uno con `category` asignada desde la lista cerrada de 6 categorías y `currency: "CLP"`.
- [ ] Todo `relatedChapterId` usado dentro de `collections[].items[]` corresponde a un capítulo real del documento.
- [ ] Se confirmó la existencia real de los archivos de imagen referenciados en `assets`.
- [ ] El documento resultante no contiene ningún campo fuera de lo definido en `STORY_PACKAGE_SCHEMA_v1.3.md`.

---

**Estado final:** el orden de §7 ya fue ejecutado. El resultado real de Buenos Aires 2026 vive en `STORY_PACKAGE_BA2026.md`, junto con sus propias notas de extracción (correcciones encontradas, gaps de schema detectados y secciones marcadas como borrador). El capítulo especial del 22 de julio quedó ahí como contenido nuevo, explícitamente marcado como borrador pendiente de tu revisión.

*Sin código, sin cambios al repositorio fuera de los documentos de `app/documentacion`.*
