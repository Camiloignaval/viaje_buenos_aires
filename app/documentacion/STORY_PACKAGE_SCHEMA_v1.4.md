# STORY_PACKAGE_SCHEMA_v1.4.md

**Autor:** Lead Software Architect
**Alcance:** Contrato de datos del Story Package.
**Estado:** Diseño de contrato, versión 1.4. Sin código, sin implementación. Reemplaza a `STORY_PACKAGE_SCHEMA_v1.3.md` como referencia vigente.

> **Nota de versionado:** pediste este archivo como `v1.3`, pero esa versión ya existe y ya fue aprobada (el cambio de `shoppingGuide` a `collections`). Para no perder esa aprobación ni el historial, este cambio queda como **v1.4** — asumo que fue un desliz al escribir el nombre, no una instrucción de sobrescribir. Avisame si en realidad querías reemplazar v1.3.

---

## 0.1 Novedades de esta versión

Traduce `SPECIAL_CHAPTER_DESIGN.md` (aprobado) al contrato. Cambia exclusivamente la forma de `specialChapter`:

1. **`specialChapter.date`** — fecha propia y explícita, independiente de `travelDates.end`.
2. **`specialChapter.kind`** — identifica que este capítulo no es "un día más" (valor recomendado: `"epilogue"`).
3. **`specialChapter.prompts` cambia de forma**: pasa de una lista de strings a una lista de objetos `Prompt`, cada uno tipado como `"retrospective"` o `"creation"`.
4. Se define cómo un `Prompt` retrospectivo **describe** qué contenido ya existente debe ofrecerse para elegir — sin que el Story Package contenga jamás datos reales de Memory Engine.
5. Se documenta la relación entre el cierre de `specialChapter` y `HistoriaEntroEnModoMemoria`, y entre sus prompts de creación y `baseCopy.anniversaryMessage`.

Todo lo demás (metadata, chapters, activities, placesCatalog, collections, checklist, budget, baseCopy, assets, invitationContent) **no cambia** respecto a v1.3.

---

## 1. Principios (sin cambios, + uno nuevo)

Se agregan a los principios ya vigentes en v1.3:

- **El Story Package nunca contiene datos de Memory Engine, ni siquiera dentro de `specialChapter`.** Un prompt retrospectivo describe *qué tipo* de contenido ya capturado se debe ofrecer para elegir (ej. "una memoria de tipo foto", "un lugar de tipo cafetería") — nunca un identificador real de una Memoria o una selección ya hecha. Esa resolución ocurre en tiempo de ejecución, entre Story Engine y Memory Engine; el contrato de contenido no la conoce.
- **Un capítulo especial no es necesariamente "el día siguiente al viaje".** Su fecha es propia y puede caer antes, durante, justo al final, o mucho después del rango de `travelDates` — nunca se deriva de `travelDates.end`.

---

## 6. `specialChapter` (revisado)

Hereda toda la estructura de `Chapter` (`id`, `order`, `title`, `activities`, `suggestedMemories`, `copy`, `assets`), más:

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `date` | **Sí (nuevo)** | fecha | Fecha propia de este capítulo. **Nunca se calcula como offset de `travelDates.end`** — es un dato independiente, tal como se resolvió en `SPECIAL_CHAPTER_DESIGN.md` §4. |
| `kind` | **Sí (nuevo)** | string | Qué tipo de capítulo especial es. Libre, no un enum cerrado — valor recomendado para este caso: `"epilogue"`. Deja espacio para que historias futuras tengan capítulos especiales de otra naturaleza (ej. un `"prologue"` para una propuesta de matrimonio al inicio del viaje). |
| `breaksNarrativeRules` | Sí | objeto | `{ hasSchedule: false, hasMap: false, hasItinerary: false }` — sin cambios. |
| `prompts` | Sí | lista de **Prompt** | **Cambia de forma** — antes era una lista de strings, ahora cada prompt es un objeto tipado (§6.1). |

**Nota de uso:** aunque `specialChapter` hereda `suggestedMemories` de `Chapter`, no debería usarse acá — los prompts de tipo `"creation"` (§6.1) cumplen exactamente ese rol, de forma más específica. Usar ambos a la vez duplicaría el mismo concepto en dos lugares del contrato.

### 6.1 `Prompt` (nuevo — reemplaza la lista de strings)

Campos comunes a todo `Prompt`:

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único dentro del capítulo. |
| `label` | Sí | string | Ej. `"Mejor momento"`, `"Carta"`. Nunca `"Calificación"` ni equivalente. |
| `type` | Sí | string | `"retrospective"` o `"creation"`. |

**Si `type` es `"retrospective"`** (selecciona/destaca algo que ya existe — nunca crea contenido nuevo):

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `retrospectiveSource` | Sí | string | `"memory"` (elige entre Memorias ya capturadas) o `"place"` (elige entre lugares de `placesCatalog`). |
| `sourceCategory` | No | string | Refina la fuente. Si `retrospectiveSource` es `"place"`: `"restaurants"` o `"cafes"`. Si es `"memory"`: `"photo"` o `"video"`. |
| `selectionPrompt` | Sí | string | El encuadre que se le muestra al viajero (ej. *"¿Cuál fue el mejor momento de estos días?"*). |

**Si `type` es `"creation"`** (crea contenido nuevo, propio de este capítulo):

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `memoryType` | Sí | string | `"photo"`, `"video"` o `"note"` — qué tipo de Memoria nueva se invita a crear. |
| `creationPrompt` | Sí | string | El porqué de este recuerdo, igual en espíritu a `SuggestedMemory.prompt`. |
| `resurfaceOnAnniversary` | No | boolean | Si el contenido resultante debe volver a mostrarse cada `ANNIVERSARY_MODE` (§6.3). Por defecto, se asume `true` para el prompt de carta. |

**Regla dura, heredada de decisiones ya tomadas:** ningún `Prompt`, de ningún tipo, puede representar una calificación o puntaje.

### 6.2 Por qué un prompt retrospectivo describe, no referencia

Al momento en que se autoría un Story Package, **no existe ninguna Memoria real todavía** — Memory Engine recién las genera cuando alguien vive la historia. Por eso `retrospectiveSource` + `sourceCategory` no son punteros a datos concretos: son una **descripción de qué preguntarle a Memory Engine en tiempo de ejecución** ("ofrecele las Memorias de tipo foto capturadas hasta ahora, para que elija una"). Esto mantiene intacta la frontera ya establecida en `DOMAIN_MODEL.md`: el Story Package describe contenido, nunca contiene datos de otro dominio.

### 6.3 Relación con Memory Mode y con `anniversaryMessage`

- **Memory Mode:** completar `specialChapter` (todo `Prompt` de tipo `creation` con su Memoria creada, todo `Prompt` de tipo `retrospective` con su elección hecha) es, por definición, lo que dispara `HistoriaEntroEnModoMemoria` (`DOMAIN_MODEL.md`, dominio Story Progress). No es una condición configurable dentro del contrato — es la razón de existir de este tipo de capítulo, así que no se modela como un campo aparte.
- **Aniversarios:** todo `Prompt` de tipo `creation` con `resurfaceOnAnniversary: true` es candidato a reaparecer cada `ANNIVERSARY_MODE`, junto con `baseCopy.anniversaryMessage` como marco narrativo neutral que lo introduce (ej. *"Hace exactamente un año..."* seguido del contenido real de la carta). El contrato no obliga a que exista un prompt de carta — pero si existe y se marca para resurgir, es lo que la "máquina del tiempo" de `09_Storytelling.md` usa como parada final de su recorrido anual.

---

## 7. Ejemplo — `specialChapter` para Buenos Aires 2026 (fragmento, con la forma nueva)

```
"specialChapter": {
  "id": "chapter-epilogue",
  "order": 5,
  "title": "Feliz cumpleaños",
  "kind": "epilogue",
  "date": "2026-07-22",
  "unlockRule": { "requiresDateReached": true, "requiresPreviousChapterCompleted": true },
  "breaksNarrativeRules": { "hasSchedule": false, "hasMap": false, "hasItinerary": false },
  "prompts": [
    { "id": "prompt-1", "label": "Mejor momento", "type": "retrospective", "retrospectiveSource": "memory", "sourceCategory": "photo", "selectionPrompt": "De estos cuatro días, ¿cuál fue el mejor momento?" },
    { "id": "prompt-2", "label": "Mejor fotografía", "type": "retrospective", "retrospectiveSource": "memory", "sourceCategory": "photo", "selectionPrompt": "¿Cuál fue la fotografía que más te gustó?" },
    { "id": "prompt-3", "label": "Restaurante favorito", "type": "retrospective", "retrospectiveSource": "place", "sourceCategory": "restaurants", "selectionPrompt": "¿Cuál fue tu restaurante favorito del viaje?" },
    { "id": "prompt-4", "label": "Cafetería favorita", "type": "retrospective", "retrospectiveSource": "place", "sourceCategory": "cafes", "selectionPrompt": "¿Y tu cafetería favorita?" },
    { "id": "prompt-5", "label": "Reflexión final", "type": "creation", "memoryType": "note", "creationPrompt": "¿Qué te gustaría recordar de este viaje dentro de diez años?" },
    { "id": "prompt-6", "label": "Carta", "type": "creation", "memoryType": "note", "creationPrompt": "Una carta para leer de nuevo cada aniversario.", "resurfaceOnAnniversary": true },
    { "id": "prompt-7", "label": "Foto o video del cumpleaños", "type": "creation", "memoryType": "photo", "creationPrompt": "Un recuerdo de hoy, tal como es — sin pose, sin apuro." }
  ]
}
```

*Nota de contenido: `prompt-7` acepta en la práctica tanto foto como video (así lo definiste); se modela con `memoryType: "photo"` porque el schema no tiene un tipo mixto — no es una limitación real, Memory Engine ya trata ambos medios como parte de una misma Memoria.*

---

*Sin código, sin implementación. El resto del contrato es idéntico a `STORY_PACKAGE_SCHEMA_v1.3.md`. A la espera de tu aprobación antes de volver a `STORY_PACKAGE_BA2026.md` para reemplazar su `specialChapter` (todavía borrador) por esta forma definitiva.*

---

## 8. Adición Etapa 6.8 — Story Intelligence Metadata (opcional, compatible)

Nueva metadata **opcional** que describe el _significado_ de un momento o lugar,
no solo su contenido. No es visible para el usuario; alimenta usos futuros
(contexto, preparativos, recordatorios, resúmenes, narrativa e IA de la Etapa 7).
Es **retrocompatible**: no requiere subir `schemaVersion`; toda historia previa
sigue siendo válida sin declarar ningún campo.

**Dónde vive:** en el campo `intelligence` de una `activity` (dentro de un
capítulo) o de un `place` (`placesCatalog.restaurants[]` / `cafes[]`). Nunca en
componentes React. Contrato TS en `src/features/story/engine/intelligence.ts`.

**Campos (todos opcionales):**

| Campo | Tipo | Uso |
|---|---|---|
| `emotion` | texto | emoción predominante del momento |
| `energyLevel` | `low \| medium \| high` | energía que demanda |
| `walkingDifficulty` | `easy \| moderate \| demanding` | dificultad para caminar |
| `familyFriendly` | boolean | apto para ir con niños |
| `rainFriendly` | boolean | se disfruta igual con lluvia |
| `photoMoment` | boolean | momento fotográfico |
| `bestMoment` | texto | mejor momento del día (ej. "atardecer") |
| `reservationRecommended` | boolean | conviene reservar |
| `cashPreferred` | boolean | conviene efectivo |
| `durationEstimate` | texto | duración estimada (ej. "45–60 min") |
| `crowdLevel` | `quiet \| moderate \| busy` | nivel de gente |
| `indoor` | boolean | bajo techo |
| `outdoor` | boolean | al aire libre |
| `budgetLevel` | `budget \| moderate \| premium` | nivel de gasto |
| `foodType` | texto | tipo de comida (lugares gastronómicos) |
| `romanticLevel` / `culturalLevel` / `historicalLevel` / `relaxLevel` | `none \| low \| medium \| high` | dimensiones cualitativas |

**Reglas de calidad:**
- Nunca inventar. Un campo se declara solo cuando existe evidencia curada.
- `indoor` y `outdoor` no pueden ser ambos `true`.
- El **Health Check Engine** valida enums, tipos y consistencia (categoría
  `intelligence`) como advertencias/sugerencias — **nunca bloquea**.

**Ejemplo (fragmento real de BA 2026):**

```
{
  "id": "la-cabrera",
  "name": "La Cabrera",
  "intelligence": { "reservationRecommended": true },
  "recommendation": "…Reserva con unos días de anticipación…"
}
```

*El campo `assets.heroImage` (capítulo y raíz) queda tipado explícitamente en el
contrato TS (`StoryAssets`), apuntando al asset real bajo `public/`.*
