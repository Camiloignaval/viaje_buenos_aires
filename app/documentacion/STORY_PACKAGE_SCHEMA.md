# STORY_PACKAGE_SCHEMA.md

**Autor:** Lead Software Architect
**Alcance:** Contrato de datos del Story Package — la única fuente de contenido que el motor de Aurora puede leer.
**Estado:** Diseño de contrato. Sin código, sin cambios al repositorio.

---

## 0. Qué es y qué no es este documento

Esto **no es un modelo de clases ni un schema de validación técnico** (eso pertenece a la fase de implementación). Es la definición del **contrato de contenido**: qué información debe existir, con qué forma, para que Story Engine, Story Progress, Memory Engine, Album Engine y Location Awareness puedan funcionar sin conocer jamás un dato específico de Buenos Aires.

Toda la notación tipo `{ clave: valor }` de este documento es **notación descriptiva**, no código ejecutable.

## 1. Principios que gobiernan este contrato

- **Un Story Package describe contenido, nunca comportamiento del viajero.** No contiene progreso, memorias capturadas, ni identidad — eso vive en otros dominios que *leen* el Story Package, nunca lo modifican.
- **No existe el campo "rating"/calificación en ningún nivel de este contrato.** Es una decisión de producto ya tomada: las calificaciones no pertenecen a la filosofía de Aurora. Donde el contenido original tenía un puntaje, aquí hay una recomendación cualitativa en texto.
- **El Story Mood se referencia, no se define acá.** El Story Package dice *qué* mood tiene asignado; el catálogo de moods y sus reglas de tono son responsabilidad del dominio Story Mood (`DOMAIN_MODEL.md` §6).
- **Ubicación es un dato compartido, no duplicado.** Cualquier entidad con lugar físico (actividad, photo spot, restaurante, capítulo especial) lleva su propio campo `location`. No existe una sección "mapa" separada con su propia lista de pines — el mapa se arma leyendo estos campos, tal como se definió en `TECHNICAL_ARCHITECTURE.md` (Maps es una capacidad de presentación, no un dominio con datos propios).
- **Todo campo que hoy no tiene consumidor real (Notification Engine) queda reservado, no resuelto.** Se define su forma para no tener que romper el contrato después, tal como pediste en el ajuste 3.

---

## 2. Estructura completa (nivel raíz)

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `storyId` | Sí | string | Identificador único de la historia. Es lo que permite, a futuro, que existan miles sin cambiar el motor. |
| `schemaVersion` | Sí | string | Versión del contrato (no del contenido). Permite evolucionar el schema sin romper historias ya publicadas. |
| `metadata` | Sí | objeto | Datos descriptivos generales (ver §3). |
| `storyMood` | Sí | objeto | Referencia al mood asignado (ver §4). |
| `unlockRulesDefault` | Sí | objeto | Regla de desbloqueo aplicada por defecto a todo capítulo que no la sobrescriba (ver §7). |
| `chapters` | Sí | lista de Chapter | Al menos un capítulo (ver §5). |
| `specialChapter` | No | Chapter especial | El capítulo que "rompe todas las reglas" (ver §6). No toda historia futura tendrá uno. |
| `baseCopy` | Sí | objeto | Textos base neutrales (ver §11). |
| `placesCatalog` | No | objeto | Restaurantes y cafeterías sugeridas (ver §9). |
| `photoSpots` | No | lista de PhotoSpot | Puntos fotográficos sugeridos (ver §8). |
| `budget` | No | objeto | Presupuesto de referencia (ver §12). |
| `checklist` | No | lista | Ítems de preparación pre-viaje (ver §13). |
| `mapConfig` | No | objeto | Configuración de vista del mapa, no datos de lugares (ver §14). |

---

## 3. `metadata`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `destination` | Sí | string | Ej. `"Buenos Aires"`. Reemplaza cualquier hardcode de ciudad. |
| `title` | Sí | string | Título narrativo de la historia. |
| `travelDates.start` | Sí | fecha | Primer día del viaje. Es la referencia contra la que Story Progress calcula desbloqueos. |
| `travelDates.end` | Sí | fecha | Último día del viaje "estándar" (sin contar el capítulo especial si cae después). |
| `travelerNames` | No | lista de string | Nombres de los protagonistas, si la historia decide personalizarse por nombre. Ausente por defecto — el motor nunca debe asumir que existe. |
| `language` | Sí | string | Idioma base del copy. |

---

## 4. `storyMood`

```
storyMood: {
  primary: "romantic",
  secondary: "food",          // opcional
  supporting: "photography"   // opcional
}
```

Solo `primary` es obligatorio. Los valores posibles vienen del catálogo del dominio Story Mood — este contrato no los enumera para no duplicar una fuente de verdad que no le pertenece.

---

## 5. `chapters` (capítulos)

Cada capítulo representa un día (u otra unidad narrativa) del viaje.

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único dentro de la historia. |
| `order` | Sí | número | Posición en la secuencia. Story Progress la usa para saber cuál es "el capítulo anterior". |
| `title` | Sí | string | Título del capítulo. |
| `unlockRule` | No | objeto | Sobrescribe `unlockRulesDefault` solo si este capítulo necesita una condición distinta (ver §7). |
| `activities` | No | lista de Activity | Propuestas del día (ver §5.1). |
| `suggestedMemories` | No | lista de SuggestedMemory | Recuerdos sugeridos del día (ver §5.2). |
| `copy` | No | objeto | Textos específicos del capítulo (apertura, cierre) que sobrescriben el `baseCopy` genérico. |

### 5.1 `activities` (actividades)

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `title` | Sí | string | Ej. `"Desayuno de medialunas"`. |
| `description` | No | string | Texto narrativo, en tono de propuesta, nunca de tarea. |
| `timeWindow` | No | string | Ej. `"09:00–10:30"`. Orientativo, no una obligación horaria. |
| `location` | No | objeto | `{ name, coordinates? }`. |
| `category` | No | string | Ej. `"gastronomía"`, `"caminata"`, `"cultura"`. Libre, no un enum cerrado — el motor no decide nada según esta categoría, es solo agrupación visual. |

Nunca existe un campo de tipo `required: true` en una actividad — el Domain Model ya estableció que las actividades son propuestas, nunca tareas obligatorias.

### 5.2 `suggestedMemories` (recuerdos sugeridos)

Esto es contenido curado por el autor de la historia — no confundir con las Memorias reales que captura el viajero (esas pertenecen al dominio Memory Engine y no viven en el Story Package).

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `relatedActivityId` | No | string | A qué actividad se asocia, si corresponde. |
| `type` | Sí | string | `"photo"`, `"video"` o `"note"` — qué tipo de recuerdo sugiere capturar. |
| `prompt` | Sí | string | La razón de por qué este recuerdo importaría con los años (aplicando el filtro de `09_Storytelling.md`: *"¿por qué esto podría importar dentro de diez años?"*). |

---

## 6. `specialChapter` (capítulo especial — ej. cumpleaños)

Tiene la misma forma base que un `Chapter`, más un bloque que declara explícitamente qué reglas normales **no aplican**:

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| *(todos los campos de Chapter)* | — | — | Hereda la misma estructura. |
| `breaksNarrativeRules` | Sí | objeto | `{ hasSchedule: false, hasMap: false, hasItinerary: false }` — declara explícitamente qué se apaga para este capítulo. |
| `prompts` | Sí | lista de string | Las invitaciones a reflexionar/registrar propias del capítulo especial (ej. `"reflexión"`, `"carta"`, `"mejor momento"`, `"mejor fotografía"`, `"restaurante favorito"`, `"cafetería favorita"`). **Deliberadamente no incluye ningún prompt de calificación** — esa pantalla queda eliminada del contrato por decisión de producto. |

`specialChapter` es opcional a nivel de schema: una historia futura con otro Story Mood podría no tener un capítulo que rompa las reglas. Buenos Aires 2026 sí lo usa.

---

## 7. `unlockRulesDefault` y `unlockRule` (reglas de desbloqueo)

```
unlockRulesDefault: {
  requiresDateReached: true,
  requiresPreviousChapterCompleted: true
}
```

- `requiresDateReached`: si es `true`, el capítulo no pasa a disponible hasta que la fecha real alcance la fecha calculada del capítulo (`travelDates.start + order`).
- `requiresPreviousChapterCompleted`: si es `true`, además necesita que el capítulo anterior esté finalizado — esta es la regla que impide "saltar" días aunque la fecha ya lo permita.

Un capítulo puede sobrescribir esto en su propio `unlockRule` — por ejemplo, el `specialChapter` normalmente mantiene ambas condiciones en `true` (fecha del cumpleaños alcanzada **y** último día de viaje finalizado), a pesar de romper todas las demás reglas narrativas.

Este bloque es, a nivel de contrato, la traducción directa y genérica de lo que `07_Business_Rules.md` y `08_State_machine.md` describían con fechas fijas — de acá en adelante, ninguna fecha vive en el motor, solo en este objeto.

---

## 8. `photoSpots`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `title` | Sí | string | Ej. `"Obelisco de día"`. |
| `location` | Sí | objeto | `{ name, coordinates? }`. |
| `bestTime` | No | string | Horario sugerido. |
| `tip` | No | string | Consejo narrativo, no instructivo. |
| `relatedChapterId` | No | string | A qué capítulo pertenece, si aplica. |

---

## 9. `placesCatalog` (restaurantes y cafeterías)

```
placesCatalog: {
  restaurants: [ Place ],
  cafes: [ Place ]
}
```

**Place:**

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `name` | Sí | string | Nombre del lugar. |
| `location` | No | objeto | `{ name, coordinates? }`. |
| `recommendation` | No | string | Texto cualitativo de por qué vale la pena — **reemplaza cualquier puntaje numérico.** |
| `priceRange` | No | string | Ej. `"$$"`. Orientativo, no ligado al `budget` real. |
| `relatedChapterId` | No | string | Si está sugerido para un día en particular. |

---

## 10. Capítulo especial vs. lugares/photo spots — regla de no duplicación

Ningún lugar (restaurante, cafetería, photo spot) necesita repetirse dentro de `specialChapter` o `chapters` si ya existe en `placesCatalog`/`photoSpots` — se referencia por `relatedChapterId` o simplemente se enumera por `id` donde haga falta. Esto evita la ambigüedad que detectamos en `07_Business_Rules.md`, donde no quedaba claro si una entidad se repetía o se relacionaba.

---

## 11. `baseCopy` (copy base)

Importante: esto es el **copy neutral de respaldo**, no el copy final que ve el viajero. El copy final resulta de combinar este texto base con las reglas de tono del Story Mood asignado (responsabilidad de ese dominio, no de este contrato).

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `welcomeMessage` | Sí | string | Mensaje de bienvenida neutral. |
| `dailyOpenTemplate` | Sí | string | Plantilla neutral para abrir un capítulo. |
| `dailyCloseTemplate` | Sí | string | Plantilla neutral para cerrar un capítulo. |
| `finalLetter` | No | string | Carta de cierre, si la historia la incluye. |
| `anniversaryMessage` | No | string | Plantilla para el mensaje anual (`"Hace exactamente X años..."`). |
| `notificationCopy` | No | objeto | **Reservado para el futuro Notification Engine** (ajuste 3): plantillas de texto por tipo de evento (`chapterUnlocked`, `specialChapterUnlocked`, `anniversary`). No tiene consumidor hoy — se define su forma para no romper el contrato cuando el motor de notificaciones exista. |

---

## 12. `budget` (opcional)

```
budget: {
  currency: "ARS",
  categories: [
    { name: "Alojamiento", estimatedAmount: 000000 },
    { name: "Comida", estimatedAmount: 000000 }
  ]
}
```

Es solo referencia para las pantallas de `PRE_TRIP` — no se conecta con gasto real ni con ningún dominio de seguimiento.

---

## 13. `checklist` (opcional)

```
checklist: [
  { id: "chk-1", category: "Documentos", label: "Pasaportes" }
]
```

---

## 14. `mapConfig` (opcional — configuración de vista, no datos de lugares)

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `centerCoordinates` | No | objeto | Punto central por defecto del mapa. |
| `defaultZoom` | No | número | Nivel de zoom inicial. |

Los pines del mapa **no se listan acá**: se derivan en tiempo de presentación a partir de los `location` de actividades, photo spots y lugares. Si `mapConfig` no existe, el mapa simplemente centra en el primer lugar disponible.

---

## 15. Campos deliberadamente ausentes de este contrato

- **`rating` / calificación**, en cualquier nivel (capítulo, lugar, photo spot). Eliminado por decisión de producto.
- **Progreso del viajero** (qué capítulo está en qué estado). Pertenece a Story Progress, nunca al Story Package.
- **Memorias reales capturadas** (fotos/videos/notas que sube el viajero). Pertenecen a Memory Engine.
- **Identidad del viajero.** Pertenece a Traveler Identity.
- **Reglas de tono del Story Mood.** Pertenecen al catálogo del dominio Story Mood, no se copian acá.

---

## 16. Ejemplo mínimo (skeleton genérico, sin contenido real)

```
{
  "storyId": "story-generic-001",
  "schemaVersion": "1.0",
  "metadata": {
    "destination": "Ciudad Ejemplo",
    "title": "Un viaje",
    "travelDates": { "start": "2027-01-01", "end": "2027-01-03" },
    "language": "es"
  },
  "storyMood": { "primary": "adventure" },
  "unlockRulesDefault": {
    "requiresDateReached": true,
    "requiresPreviousChapterCompleted": true
  },
  "chapters": [
    { "id": "chapter-1", "order": 1, "title": "Día 1" },
    { "id": "chapter-2", "order": 2, "title": "Día 2" }
  ],
  "baseCopy": {
    "welcomeMessage": "Un nuevo viaje está por comenzar.",
    "dailyOpenTemplate": "Hoy comienza un nuevo capítulo.",
    "dailyCloseTemplate": "Descansá. Mañana seguimos."
  }
}
```

Esto es, a propósito, lo mínimo que el Story Engine necesita para no romperse. Todo lo demás es enriquecimiento.

## 17. Ejemplo completo — Buenos Aires 2026 (abreviado, representativo)

```
{
  "storyId": "story-ba-2026",
  "schemaVersion": "1.0",
  "metadata": {
    "destination": "Buenos Aires",
    "title": "Buenos Aires, 2026",
    "travelDates": { "start": "2026-07-18", "end": "2026-07-21" },
    "travelerNames": ["Camilo", "Kari"],
    "language": "es"
  },
  "storyMood": { "primary": "romantic" },
  "unlockRulesDefault": {
    "requiresDateReached": true,
    "requiresPreviousChapterCompleted": true
  },
  "chapters": [
    {
      "id": "chapter-1",
      "order": 1,
      "title": "La llegada",
      "activities": [
        {
          "id": "act-1-1",
          "title": "Desayuno de medialunas",
          "timeWindow": "09:00–10:30",
          "location": { "name": "Café en Recoleta" },
          "category": "gastronomía"
        },
        {
          "id": "act-1-2",
          "title": "Obelisco y Av. Corrientes",
          "location": { "name": "Obelisco de Buenos Aires" },
          "category": "caminata"
        }
      ],
      "suggestedMemories": [
        {
          "id": "mem-sug-1",
          "relatedActivityId": "act-1-2",
          "type": "photo",
          "prompt": "El primer paso juntos en una ciudad nueva."
        }
      ]
    },
    { "id": "chapter-2", "order": 2, "title": "La ciudad se siente familiar" },
    { "id": "chapter-3", "order": 3, "title": "Caminamos como locales" },
    { "id": "chapter-4", "order": 4, "title": "El último atardecer" }
  ],
  "specialChapter": {
    "id": "chapter-birthday",
    "order": 5,
    "title": "Feliz cumpleaños",
    "unlockRule": {
      "requiresDateReached": true,
      "requiresPreviousChapterCompleted": true
    },
    "breaksNarrativeRules": { "hasSchedule": false, "hasMap": false, "hasItinerary": false },
    "prompts": ["reflexión", "carta", "restaurante favorito", "cafetería favorita", "mejor momento", "mejor fotografía"]
  },
  "photoSpots": [
    {
      "id": "spot-obelisco",
      "title": "Obelisco de día",
      "location": { "name": "Av. Corrientes y Av. 9 de Julio" },
      "bestTime": "09:00 a 10:30",
      "tip": "La luz de la mañana deja la avenida casi vacía."
    }
  ],
  "placesCatalog": {
    "restaurants": [
      { "id": "rest-cabrera", "name": "La Cabrera", "recommendation": "El lugar para una cena larga y sin apuro." }
    ],
    "cafes": [
      { "id": "cafe-cuartito", "name": "El Cuartito", "recommendation": "Medialunas que se volvieron parte de la historia." }
    ]
  },
  "baseCopy": {
    "welcomeMessage": "Un viaje está por comenzar.",
    "dailyOpenTemplate": "Buenos días. Hoy comienza una nueva aventura.",
    "dailyCloseTemplate": "Descansemos. Nos vemos mañana.",
    "finalLetter": "Gracias por estos días. Todavía queda un último capítulo.",
    "anniversaryMessage": "Hace exactamente un año..."
  }
}
```

Notar lo que **no aparece**: ningún puntaje numérico de restaurante, ninguna lógica de fechas fuera de `metadata.travelDates` y `unlockRule`, y ningún dato que el motor necesite interpretar de forma especial por ser "Buenos Aires" — todo pasa por los mismos campos que usaría cualquier otra historia futura.

---

## 18. Por qué este contrato ya soporta múltiples historias

Ninguno de los ejemplos anteriores requiere que el motor sepa que existe "Buenos Aires" o "Kari" — ambos ejemplos son instancias válidas de la misma forma. Agregar Bariloche 2027 es, literalmente, escribir un tercer documento con esta misma estructura. Esa es la prueba de que el contrato cumple su propósito.

---

*Sin código, sin cambios al repositorio. A la espera de aprobación antes de iniciar el Paso 1 del plan de migración (extracción del contenido actual a este contrato).*
