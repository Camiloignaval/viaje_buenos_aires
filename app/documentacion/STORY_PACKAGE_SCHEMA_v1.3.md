# STORY_PACKAGE_SCHEMA_v1.3.md

**Autor:** Lead Software Architect
**Alcance:** Contrato de datos del Story Package — la única fuente de contenido que el motor de Aurora puede leer.
**Estado:** Diseño de contrato, versión 1.3 — **aprobada**. Sin código, sin cambios al repositorio. Reemplaza a `STORY_PACKAGE_SCHEMA_v1.2.md` como referencia vigente.

---

## 0. Qué es y qué no es este documento

Esto **no es un modelo de clases ni un schema de validación técnico**. Es la definición del **contrato de contenido**: qué información debe existir, con qué forma, para que Story Engine, Story Progress, Memory Engine, Album Engine y Location Awareness puedan funcionar sin conocer jamás un dato específico de Buenos Aires.

Toda la notación tipo `{ clave: valor }` de este documento es **notación descriptiva**, no código ejecutable.

### 0.1 Novedades de esta versión

Hereda íntegramente todo lo definido en v1.2. Se reemplaza:

1. **`shoppingGuide` → `CuratedCollections` (`collections[]`).** En v1.2, `shoppingGuide` asumía que lo único curable era "souvenirs". El rediseño generaliza el concepto: cualquier historia puede tener **múltiples colecciones curadas** de cualquier tipo (souvenirs, dulces y chocolates, libros, vinilos, productos locales, regalos, cafés para llevar, objetos de diseño, o cualquier otra que un futuro autor decida). Buenos Aires 2026 usa, por ahora, una sola colección: **Souvenirs**.

---

## 1. Principios que gobiernan este contrato

- **Un Story Package describe contenido, nunca comportamiento del viajero.**
- **No existe el campo "rating"/calificación en ningún nivel de este contrato.**
- **El Story Mood se referencia, no se define acá.**
- **Ubicación es un dato compartido, no duplicado.**
- **Los links (mapas, viajes, sitios web) son contenido de apoyo, no lógica.**
- **Los assets visuales describen cómo se ve la historia, nunca reemplazan una Memoria real.**
- **El Story Package nunca contiene tokens, contraseñas ni permisos** (ver §18).
- **`collections` es contenido curado, plural y abierto.** No representa compras reales — cada colección sugiere elementos que podrían valer la pena, nunca registra qué se compró de verdad (eso, si existiera, pertenecería a Memory Engine). Tampoco se combina con `budget`: uno planea el viaje, el otro inspira ideas de recuerdos/regalos.
- **Todo campo sin consumidor real hoy (Notification Engine) queda reservado, no resuelto.**

---

## 2. Estructura completa (nivel raíz)

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `storyId` | Sí | string | Identificador único de la historia. |
| `schemaVersion` | Sí | string | Versión del contrato. |
| `metadata` | Sí | objeto | Datos descriptivos generales (§3). |
| `storyMood` | Sí | objeto | Referencia al mood asignado (§4). |
| `unlockRulesDefault` | Sí | objeto | Regla de desbloqueo por defecto (§7). |
| `chapters` | Sí | lista de Chapter | Al menos un capítulo (§5). |
| `specialChapter` | No | Chapter especial | El capítulo que "rompe todas las reglas" (§6). |
| `photoSpots` | No | lista de PhotoSpot | Puntos fotográficos sugeridos (§8). |
| `placesCatalog` | No | objeto | Restaurantes y cafeterías sugeridas (§9). |
| `collections` | No | lista de CuratedCollection | Colecciones curadas de elementos relacionados (§11). |
| `baseCopy` | Sí | objeto | Textos base neutrales (§12). |
| `budget` | No | objeto | Presupuesto de referencia (§13). |
| `checklist` | No | lista | Ítems de preparación pre-viaje (§14). |
| `mapConfig` | No | objeto | Configuración de vista del mapa (§15). |
| `assets` | No | objeto | Imágenes de identidad de la historia completa (§16). |
| `invitationContent` | No | objeto | Copy de apoyo para la pantalla de invitación/acceso (§17). |

---

## 3. `metadata`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `destination` | Sí | string | Ej. `"Buenos Aires"`. |
| `title` | Sí | string | Título narrativo de la historia. |
| `travelDates.start` | Sí | fecha | Primer día del viaje. |
| `travelDates.end` | Sí | fecha | Último día del viaje "estándar". |
| `travelerNames` | No | lista de string | Nombres de los protagonistas. |
| `language` | Sí | string | Idioma base del copy. |

## 4. `storyMood`

```
storyMood: { primary: "romantic", secondary: "food", supporting: "photography" }
```

Solo `primary` es obligatorio.

## 5. `chapters`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `order` | Sí | número | Posición en la secuencia. |
| `title` | Sí | string | Título del capítulo. |
| `unlockRule` | No | objeto | Sobrescribe `unlockRulesDefault` (§7). |
| `activities` | No | lista de Activity | Propuestas del día (§5.1). |
| `suggestedMemories` | No | lista de SuggestedMemory | Recuerdos sugeridos del día (§5.2). |
| `copy` | No | objeto | Textos específicos que sobrescriben el `baseCopy` genérico. |
| `assets` | No | objeto | Imágenes propias del capítulo (§16). |

### 5.1 `activities`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `title` | Sí | string | — |
| `description` | No | string | Texto narrativo, en tono de propuesta. |
| `timeWindow` | No | string | Orientativo. |
| `category` | No | string | Libre. |
| `relatedPlaceId` | No | string | Referencia a un `Place` de `placesCatalog` (§10). |
| `location.name` | No | string | — |
| `location.coordinates` | No | objeto | — |
| `location.googleMapsUrl` | No | string | — |
| `location.uberDeepLink` | No | string | — |
| `location.cabifyDeepLink` | No | string | — |
| `websiteUrl` | No | string | — |

### 5.2 `suggestedMemories`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | — |
| `relatedActivityId` | No | string | — |
| `type` | Sí | string | `"photo"`, `"video"` o `"note"`. |
| `prompt` | Sí | string | Por qué este recuerdo importaría con los años. |

## 6. `specialChapter`

Hereda toda la estructura de `Chapter`, más:

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `breaksNarrativeRules` | Sí | objeto | `{ hasSchedule: false, hasMap: false, hasItinerary: false }`. |
| `prompts` | Sí | lista de string | Sin ningún prompt de calificación. |

## 7. `unlockRulesDefault` y `unlockRule`

```
unlockRulesDefault: { requiresDateReached: true, requiresPreviousChapterCompleted: true }
```

## 8. `photoSpots`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | — |
| `title` | Sí | string | — |
| `location.name` | Sí | string | — |
| `location.coordinates` | No | objeto | — |
| `location.googleMapsUrl` | No | string | — |
| `location.uberDeepLink` | No | string | — |
| `location.cabifyDeepLink` | No | string | — |
| `websiteUrl` | No | string | — |
| `bestTime` | No | string | — |
| `tip` | No | string | — |
| `relatedChapterId` | No | string | — |

## 9. `placesCatalog`

```
placesCatalog: { restaurants: [ Place ], cafes: [ Place ] }
```

**Place:**

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | — |
| `name` | Sí | string | — |
| `location.name` | No | string | — |
| `location.coordinates` | No | objeto | — |
| `location.googleMapsUrl` | No | string | — |
| `location.uberDeepLink` | No | string | — |
| `location.cabifyDeepLink` | No | string | — |
| `websiteUrl` | No | string | — |
| `recommendation` | No | string | Reemplaza cualquier puntaje numérico. |
| `priceRange` | No | string | — |
| `relatedChapterId` | No | string | — |

## 10. Regla de no duplicación

Ningún lugar necesita repetirse: una actividad referencia un `Place` de `placesCatalog` mediante `relatedPlaceId`. La misma regla aplica entre `collections` y `placesCatalog`.

---

## 11. `collections` (antes `shoppingGuide` — generalizado a Curated Collections)

```
collections: [ CuratedCollection ]
```

**CuratedCollection:**

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único de la colección. |
| `title` | Sí | string | Ej. `"Souvenirs"`, `"Dulces y chocolates"`, `"Libros"`. |
| `description` | Sí | string | Encuadre narrativo de la colección. |
| `icon` | No | string | Referencia visual de la colección (ej. `"ic-gift"`). |
| `items` | Sí | lista de CollectionItem | Los elementos curados de esta colección. |

**CollectionItem:**

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `name` | Sí | string | Ej. `"Alfajores Havanna"`. |
| `category` | Sí | string | Libre, igual que `activity.category`. |
| `description` | Sí | string | Breve razón de por qué podría valer la pena. |
| `suggestedWhereToBuy` | Sí | string | Puntual o general. |
| `estimatedPrice` | Sí | string | Texto libre — admite rangos o `"Variable"`. |
| `currency` | Sí | string | Ej. `"CLP"`. |
| `relatedChapterId` | No | string | — |
| `location` | No | objeto | Mismo shape que en Activity/Place, si el ítem tiene un lugar puntual. |
| `websiteUrl` | No | string | — |
| `notes` | No | string | — |

**Ejemplos de colecciones posibles** (no exhaustivo, cualquier historia puede definir las suyas): Souvenirs, Dulces y chocolates, Libros, Vinilos, Productos locales, Regalos, Cafés para llevar, Objetos de diseño.

**Reglas que gobiernan este bloque:**

- `collections` es contenido curado por el autor de la historia, plural y abierto — una historia puede tener una sola colección (como Buenos Aires 2026 con "Souvenirs") o varias.
- Completamente opcional a nivel de schema.
- No pertenece a Memory Engine ni a `budget`.
- No representa compras reales, solo sugerencias.

---

## 12. `baseCopy`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `welcomeMessage` | Sí | string | — |
| `dailyOpenTemplate` | Sí | string | — |
| `dailyCloseTemplate` | Sí | string | — |
| `finalLetter` | No | string | — |
| `anniversaryMessage` | No | string | — |
| `notificationCopy` | No | objeto | Reservado para el futuro Notification Engine. |

## 13. `budget`

```
budget: { currency: "CLP", categories: [ { name: "Alojamiento", estimatedAmount: 000000 } ] }
```

## 14. `checklist`

```
checklist: [ { id: "chk-1", category: "Documentos", label: "Pasaportes" } ]
```

## 15. `mapConfig`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `centerCoordinates` | No | objeto | — |
| `defaultZoom` | No | número | — |

Los pines se derivan de los `location` de actividades, photo spots, lugares y los ítems de `collections` que tengan `location`.

## 16. `assets`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `heroImage` | No | string | — |
| `thumbnailImage` | No | string | — |
| `galleryImages` | No | lista de string | — |
| `lockedPreviewImage` | No | string | Nunca spoilea. |

## 17. `invitationContent`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `invitationTitle` | No | string | — |
| `invitationMessage` | No | string | — |
| `qrLandingCopy` | No | string | — |
| `installPromptCopy` | No | string | — |

## 18. Frontera con Story Access

**Story Package define contenido. Story Access define quién puede verlo.** Nunca tokens, contraseñas ni permisos.

## 19. Campos deliberadamente ausentes

- `rating` / calificación, en cualquier nivel.
- Tokens, contraseñas, permisos.
- Progreso del viajero.
- Memorias reales capturadas.
- Compras reales del viajero.
- Identidad del viajero.
- Reglas de tono del Story Mood.

---

## 20. Ejemplo mínimo

```
{
  "storyId": "story-generic-001",
  "schemaVersion": "1.3",
  "metadata": {
    "destination": "Ciudad Ejemplo",
    "title": "Un viaje",
    "travelDates": { "start": "2027-01-01", "end": "2027-01-03" },
    "language": "es"
  },
  "storyMood": { "primary": "adventure" },
  "unlockRulesDefault": { "requiresDateReached": true, "requiresPreviousChapterCompleted": true },
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

## 21. Fragmento — `collections` para Buenos Aires 2026

```
"collections": [
  {
    "id": "col-souvenirs",
    "title": "Souvenirs",
    "description": "Veinte ideas para no volver con las manos vacías, sin que se sienta una lista de compras.",
    "icon": "ic-gift",
    "items": [
      {
        "id": "sh-1",
        "name": "Alfajores Havanna",
        "category": "gastronomía",
        "description": "El clásico que nunca falla.",
        "suggestedWhereToBuy": "Cualquier local de la cadena o el shopping",
        "estimatedPrice": "$8.000",
        "currency": "CLP"
      }
    ]
  }
]
```

El resto de la historia sigue exactamente la forma ya definida en v1.2. La extracción completa y real de Buenos Aires 2026 (todas las colecciones, capítulos, lugares y copy) vive en `STORY_PACKAGE_BA2026.md`, no en este documento de contrato.

---

## 22. Por qué este contrato ya soporta múltiples historias

`collections` es, otra vez, la prueba más clara: una historia futura puede tener cero, una o diez colecciones distintas (libros, vinilos, café de especialidad), sin que el Story Engine necesite saber que ese concepto cambió de forma.

---

*Sin código, sin cambios al repositorio.*
