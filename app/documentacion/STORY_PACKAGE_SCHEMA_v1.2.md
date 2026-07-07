# STORY_PACKAGE_SCHEMA_v1.2.md

**Autor:** Lead Software Architect
**Alcance:** Contrato de datos del Story Package — la única fuente de contenido que el motor de Aurora puede leer.
**Estado:** Diseño de contrato, versión 1.2. Sin código, sin cambios al repositorio. Reemplaza a `STORY_PACKAGE_SCHEMA_v1.1.md` como referencia vigente.

---

## 0. Qué es y qué no es este documento

Esto **no es un modelo de clases ni un schema de validación técnico** (eso pertenece a la fase de implementación). Es la definición del **contrato de contenido**: qué información debe existir, con qué forma, para que Story Engine, Story Progress, Memory Engine, Album Engine y Location Awareness puedan funcionar sin conocer jamás un dato específico de Buenos Aires.

Toda la notación tipo `{ clave: valor }` de este documento es **notación descriptiva**, no código ejecutable.

### 0.1 Novedades de esta versión

Hereda íntegramente todo lo definido en v1.1 (links de navegación, assets visuales, invitationContent, frontera con Story Access). Se agrega:

1. **Nuevo bloque opcional `shoppingGuide`** (§11): una guía curada de posibles recuerdos/regalos, resolviendo el contenido de souvenirs que en v1.1 había quedado detectado como gap sin campo propio.

---

## 1. Principios que gobiernan este contrato

- **Un Story Package describe contenido, nunca comportamiento del viajero.** No contiene progreso, memorias capturadas, ni identidad.
- **No existe el campo "rating"/calificación en ningún nivel de este contrato.**
- **El Story Mood se referencia, no se define acá.**
- **Ubicación es un dato compartido, no duplicado.**
- **Los links (mapas, viajes, sitios web) son contenido de apoyo, no lógica.**
- **Los assets visuales describen cómo se ve la historia, nunca reemplazan una Memoria real.**
- **El Story Package nunca contiene tokens, contraseñas ni permisos** (ver §18).
- **`shoppingGuide` es contenido curado y opcional, y nunca se confunde con una compra real.** Sugiere qué podría valer la pena llevarse — no registra qué se compró de verdad. Eso, si algún día existiera, pertenecería a Memory Engine (una compra real capturada por el viajero), nunca al Story Package. Tampoco pertenece a `budget`: `budget` es presupuesto de referencia para planear el viaje, `shoppingGuide` es inspiración de regalos/recuerdos — son dos preguntas distintas ("¿cuánto me puede costar el viaje?" vs. "¿qué me podría llevar de recuerdo?").
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
| `shoppingGuide` | No | objeto | Guía curada de recuerdos/regalos sugeridos (§11). |
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

---

## 4. `storyMood`

```
storyMood: {
  primary: "romantic",
  secondary: "food",          // opcional
  supporting: "photography"   // opcional
}
```

---

## 5. `chapters` (capítulos)

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único dentro de la historia. |
| `order` | Sí | número | Posición en la secuencia. |
| `title` | Sí | string | Título del capítulo. |
| `unlockRule` | No | objeto | Sobrescribe `unlockRulesDefault` (§7). |
| `activities` | No | lista de Activity | Propuestas del día (§5.1). |
| `suggestedMemories` | No | lista de SuggestedMemory | Recuerdos sugeridos del día (§5.2). |
| `copy` | No | objeto | Textos específicos que sobrescriben el `baseCopy` genérico. |
| `assets` | No | objeto | Imágenes propias del capítulo (§16). |

### 5.1 `activities` (actividades)

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `title` | Sí | string | Ej. `"Caminata por el Obelisco"`. |
| `description` | No | string | Texto narrativo, en tono de propuesta. |
| `timeWindow` | No | string | Ej. `"09:00–10:30"`. Orientativo. |
| `category` | No | string | Libre, no un enum cerrado. |
| `relatedPlaceId` | No | string | Referencia a un `Place` de `placesCatalog` (§10). |
| `location.name` | No | string | Nombre del lugar. |
| `location.coordinates` | No | objeto | Coordenadas, si existen. |
| `location.googleMapsUrl` | No | string | Link directo a Google Maps. |
| `location.uberDeepLink` | No | string | Deep link a Uber. |
| `location.cabifyDeepLink` | No | string | Deep link a Cabify. |
| `websiteUrl` | No | string | Sitio web del lugar o de la experiencia. |

### 5.2 `suggestedMemories` (recuerdos sugeridos)

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `relatedActivityId` | No | string | A qué actividad se asocia. |
| `type` | Sí | string | `"photo"`, `"video"` o `"note"`. |
| `prompt` | Sí | string | Por qué este recuerdo importaría con los años. |

---

## 6. `specialChapter` (capítulo especial — ej. cumpleaños)

Hereda toda la estructura de `Chapter` (incluido `assets`), más:

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `breaksNarrativeRules` | Sí | objeto | `{ hasSchedule: false, hasMap: false, hasItinerary: false }`. |
| `prompts` | Sí | lista de string | Ej. `"reflexión"`, `"carta"`, `"mejor momento"`, `"mejor fotografía"`, `"restaurante favorito"`, `"cafetería favorita"`. Sin ningún prompt de calificación. |

---

## 7. `unlockRulesDefault` y `unlockRule`

```
unlockRulesDefault: {
  requiresDateReached: true,
  requiresPreviousChapterCompleted: true
}
```

---

## 8. `photoSpots`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `title` | Sí | string | Ej. `"Obelisco de día"`. |
| `location.name` | Sí | string | Nombre del lugar. |
| `location.coordinates` | No | objeto | Coordenadas, si existen. |
| `location.googleMapsUrl` | No | string | Link directo a Google Maps. |
| `location.uberDeepLink` | No | string | Deep link a Uber. |
| `location.cabifyDeepLink` | No | string | Deep link a Cabify. |
| `websiteUrl` | No | string | Si el spot pertenece a un lugar con sitio propio. |
| `bestTime` | No | string | Horario sugerido. |
| `tip` | No | string | Consejo narrativo. |
| `relatedChapterId` | No | string | A qué capítulo pertenece. |

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
| `location.name` | No | string | Nombre/dirección de referencia. |
| `location.coordinates` | No | objeto | Coordenadas, si existen. |
| `location.googleMapsUrl` | No | string | Link directo a Google Maps. |
| `location.uberDeepLink` | No | string | Deep link a Uber. |
| `location.cabifyDeepLink` | No | string | Deep link a Cabify. |
| `websiteUrl` | No | string | Sitio web del lugar. |
| `recommendation` | No | string | Texto cualitativo — reemplaza cualquier puntaje numérico. |
| `priceRange` | No | string | Ej. `"$$"`. Orientativo. |
| `relatedChapterId` | No | string | Si está sugerido para un día en particular. |

---

## 10. Regla de no duplicación (lugares)

Ningún lugar necesita repetirse: una actividad puede referenciar un `Place` ya existente en `placesCatalog` mediante `relatedPlaceId`. Esta misma regla aplica entre `shoppingGuide` y `placesCatalog`: si un souvenir se consigue en un lugar ya catalogado (ej. una cafetería que también vende medialunas para llevar), se referencia, no se duplica.

---

## 11. `shoppingGuide` (nuevo — guía curada de recuerdos/regalos)

```
shoppingGuide: {
  title: "Souvenirs — qué vale la pena llevarse",
  description: "Una selección curada, no una lista de compras.",
  items: [ ShoppingItem ]
}
```

| Campo (raíz de `shoppingGuide`) | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `title` | Sí | string | Título de la sección. |
| `description` | Sí | string | Encuadre narrativo — deja claro que es curaduría, no una checklist de compras. |
| `items` | Sí | lista de ShoppingItem | Los ítems sugeridos. |

**ShoppingItem:**

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `name` | Sí | string | Ej. `"Alfajores Havanna"`. |
| `category` | Sí | string | Ej. `"gastronomía"`, `"bebida"`, `"moda"`, `"colección"`, `"decoración"`. Libre, no un enum cerrado — igual que `activity.category`. |
| `description` | Sí | string | Breve razón de por qué podría valer la pena. |
| `suggestedWhereToBuy` | Sí | string | Puede ser un lugar puntual o una referencia general (ej. `"Galerías Pacífico"`, `"Cualquier supermercado"`). |
| `estimatedPrice` | Sí | string | Texto libre, admite rangos (`"$15.000–$25.000 CLP"`) o valores no definidos (`"Variable"`) — no es un número exacto porque no representa una compra real. |
| `currency` | Sí | string | Ej. `"CLP"`. |
| `relatedChapterId` | No | string | Si el souvenir está asociado a un día puntual del viaje. |
| `googleMapsUrl` | No | string | Si el lugar sugerido tiene ubicación puntual. |
| `notes` | No | string | Cualquier aclaración adicional (ej. "de las mejores de la ciudad"). |

**Reglas que gobiernan este bloque (confirmadas):**

- `shoppingGuide` es contenido curado por el autor de la historia, igual que `suggestedMemories` — no es generado a partir de comportamiento del viajero.
- Es completamente opcional a nivel de schema — una historia futura puede no tenerlo.
- No pertenece a Memory Engine: ninguna compra real que haga el viajero se registra acá.
- No pertenece a `budget`: uno planea el viaje, el otro inspira regalos — no se combinan en un solo total.
- No representa compras reales, solo sugerencias — de ahí que `estimatedPrice` sea texto libre y no un número con el que se pueda operar.

---

## 12. `baseCopy` (copy base)

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `welcomeMessage` | Sí | string | Mensaje de bienvenida neutral. |
| `dailyOpenTemplate` | Sí | string | Plantilla neutral para abrir un capítulo. |
| `dailyCloseTemplate` | Sí | string | Plantilla neutral para cerrar un capítulo. |
| `finalLetter` | No | string | Carta de cierre, si la historia la incluye. |
| `anniversaryMessage` | No | string | Plantilla para el mensaje anual. |
| `notificationCopy` | No | objeto | Reservado para el futuro Notification Engine. |

## 13. `budget` (opcional)

```
budget: {
  currency: "CLP",
  categories: [
    { name: "Alojamiento", estimatedAmount: 000000 },
    { name: "Comida", estimatedAmount: 000000 }
  ]
}
```

## 14. `checklist` (opcional)

```
checklist: [
  { id: "chk-1", category: "Documentos", label: "Pasaportes" }
]
```

## 15. `mapConfig` (opcional)

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `centerCoordinates` | No | objeto | Punto central por defecto del mapa. |
| `defaultZoom` | No | número | Nivel de zoom inicial. |

Los pines no se listan acá — se derivan de los `location` de actividades, photo spots, lugares y, ahora también, de los ítems de `shoppingGuide` que tengan `googleMapsUrl`.

---

## 16. `assets`

Misma forma reutilizada a nivel raíz y dentro de cada `chapter`/`specialChapter`.

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `heroImage` | No | string | Imagen principal/portada. |
| `thumbnailImage` | No | string | Miniatura para listados. |
| `galleryImages` | No | lista de string | Imágenes editoriales — nunca Memorias reales del viajero. |
| `lockedPreviewImage` | No | string | Imagen mostrada mientras el contenido real sigue bloqueado — nunca spoilea. |

---

## 17. `invitationContent`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `invitationTitle` | No | string | Título de la tarjeta/invitación de entrada. |
| `invitationMessage` | No | string | Mensaje personalizado de invitación. |
| `qrLandingCopy` | No | string | Texto que ve quien escanea el QR, antes de instalar. |
| `installPromptCopy` | No | string | Texto que acompaña el paso de instalación. |

---

## 18. Frontera con Story Access (regla explícita)

**Story Package define contenido. Story Access define quién puede verlo.** Este contrato no contiene, y nunca debe contener, tokens, contraseñas, claves de invitación ni permisos. `invitationContent` es la única superficie de contacto entre ambos dominios, y es exclusivamente texto.

---

## 19. Campos deliberadamente ausentes de este contrato

- **`rating` / calificación**, en cualquier nivel.
- **Tokens, contraseñas, permisos o cualquier mecanismo de autorización.**
- **Progreso del viajero.** Pertenece a Story Progress.
- **Memorias reales capturadas.** Pertenecen a Memory Engine.
- **Compras reales del viajero.** `shoppingGuide` es sugerencia curada, nunca un registro de qué se compró de verdad — eso, si existiera, pertenecería a Memory Engine, no a este contrato.
- **Identidad del viajero.** Pertenece a Traveler Identity.
- **Reglas de tono del Story Mood.** Pertenecen al catálogo de ese dominio.

---

## 20. Ejemplo mínimo (skeleton genérico, sin contenido real)

```
{
  "storyId": "story-generic-001",
  "schemaVersion": "1.2",
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

`shoppingGuide` no aparece en el mínimo — es enriquecimiento opcional, igual que en v1.1.

## 21. Ejemplo completo — Buenos Aires 2026 (fragmento, con `shoppingGuide`)

```
{
  "storyId": "story-ba-2026",
  "schemaVersion": "1.2",

  "shoppingGuide": {
    "title": "Souvenirs — qué vale la pena llevarse",
    "description": "Veinte ideas para no volver con las manos vacías, sin que se sienta una lista de compras.",
    "items": [
      {
        "id": "sh-1",
        "name": "Alfajores Havanna",
        "category": "gastronomía",
        "description": "El clásico que nunca falla.",
        "suggestedWhereToBuy": "Cualquier local de la cadena o el shopping",
        "estimatedPrice": "$8.000",
        "currency": "CLP"
      },
      {
        "id": "sh-2",
        "name": "Chocolate Rapanui",
        "category": "gastronomía",
        "description": "Una parada dulce que ya es parte del Día 1.",
        "suggestedWhereToBuy": "Rapanui, Av. Corrientes",
        "estimatedPrice": "$10.000",
        "currency": "CLP",
        "relatedChapterId": "chapter-1"
      },
      {
        "id": "sh-3",
        "name": "Mate y bombilla",
        "category": "tradición",
        "description": "El set completo para llevarse un ritual, no solo un objeto.",
        "suggestedWhereToBuy": "Casas de artículos regionales, San Telmo o Florida",
        "estimatedPrice": "$15.000–$25.000",
        "currency": "CLP"
      },
      {
        "id": "sh-4",
        "name": "Libro en español",
        "category": "colección",
        "description": "Algo para llevarse con el sello de una librería única en el mundo.",
        "suggestedWhereToBuy": "El Ateneo Grand Splendid",
        "estimatedPrice": "$10.000–$18.000",
        "currency": "CLP",
        "relatedChapterId": "chapter-4"
      },
      {
        "id": "sh-5",
        "name": "Medialunas para llevar (Las Violetas)",
        "category": "gastronomía",
        "description": "El leitmotiv del viaje, en versión para el avión de vuelta.",
        "suggestedWhereToBuy": "Las Violetas, Almagro",
        "estimatedPrice": "$8.000 la docena",
        "currency": "CLP",
        "relatedChapterId": "chapter-4"
      }
    ]
  }
}
```

*(Fragmento — el resto de la historia sigue exactamente la forma ya definida en v1.1: `metadata`, `chapters`, `specialChapter`, `placesCatalog`, `photoSpots`, `baseCopy`, `assets`, `invitationContent`. No se repite acá para no duplicar contenido ya aprobado; los 20 ítems reales de `shoppingGuide` se completan en la extracción, no en este contrato.)*

---

## 22. Por qué este contrato ya soporta múltiples historias

Ninguno de los ejemplos anteriores requiere que el motor sepa que existe "Buenos Aires" o "Kari". `shoppingGuide` es, otra vez, la misma forma para cualquier historia futura — una con otro mood simplemente tendrá una lista de ítems distinta, o directamente no tendrá el bloque.

---

*Sin código, sin cambios al repositorio. A la espera de aprobación antes de continuar con el plan de extracción actualizado.*
