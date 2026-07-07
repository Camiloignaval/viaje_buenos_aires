# STORY_PACKAGE_SCHEMA_v1.1.md

**Autor:** Lead Software Architect
**Alcance:** Contrato de datos del Story Package — la única fuente de contenido que el motor de Aurora puede leer.
**Estado:** Diseño de contrato, versión 1.1. Sin código, sin cambios al repositorio. Reemplaza a `STORY_PACKAGE_SCHEMA.md` como referencia vigente.

---

## 0. Qué es y qué no es este documento

Esto **no es un modelo de clases ni un schema de validación técnico** (eso pertenece a la fase de implementación). Es la definición del **contrato de contenido**: qué información debe existir, con qué forma, para que Story Engine, Story Progress, Memory Engine, Album Engine y Location Awareness puedan funcionar sin conocer jamás un dato específico de Buenos Aires.

Toda la notación tipo `{ clave: valor }` de este documento es **notación descriptiva**, no código ejecutable.

### 0.1 Novedades de esta versión

1. **Corrección del ejemplo de Buenos Aires 2026:** el Día 1 ya no arranca con "Desayuno de medialunas". El desayuno del hotel queda como parte del contenido real; las medialunas pasan a ser una experiencia de cafetería sugerida, no un reemplazo del desayuno incluido.
2. **Soporte de links de navegación** (`googleMapsUrl`, `uberDeepLink`, `cabifyDeepLink`, `websiteUrl`) en Activity, Place y PhotoSpot.
3. **Soporte de assets visuales** (`heroImage`, `thumbnailImage`, `galleryImages`, `lockedPreviewImage`) a nivel de historia completa y a nivel de cada capítulo (§15).
4. **Soporte de copy de invitación/acceso** (`invitationTitle`, `invitationMessage`, `qrLandingCopy`, `installPromptCopy`) como contenido, no como mecanismo (§16).
5. **Frontera explícita con Story Access:** el Story Package nunca contiene tokens, contraseñas ni permisos (§17).

---

## 1. Principios que gobiernan este contrato

- **Un Story Package describe contenido, nunca comportamiento del viajero.** No contiene progreso, memorias capturadas, ni identidad — eso vive en otros dominios que *leen* el Story Package, nunca lo modifican.
- **No existe el campo "rating"/calificación en ningún nivel de este contrato.** Donde el contenido original tenía un puntaje, aquí hay una recomendación cualitativa en texto.
- **El Story Mood se referencia, no se define acá.** El catálogo de moods y sus reglas de tono son responsabilidad del dominio Story Mood.
- **Ubicación es un dato compartido, no duplicado.** El mapa se arma leyendo los campos `location` ya existentes en actividades, photo spots y lugares — nunca hay una lista de pines paralela.
- **Los links (mapas, viajes, sitios web) son contenido de apoyo, no lógica.** El Story Package puede sugerir cómo llegar a un lugar, pero nunca decide ni ejecuta nada — son datos que la Presentation capa simplemente muestra como enlaces.
- **Los assets visuales describen cómo se ve la historia, nunca reemplazan una Memoria real.** `galleryImages` es contenido editorial curado por el autor; una fotografía capturada por el viajero pertenece siempre a Memory Engine.
- **El Story Package nunca contiene tokens, contraseñas ni permisos.** Quién puede entrar a una historia es responsabilidad exclusiva de Story Access (ver §17).
- **Todo campo sin consumidor real hoy (Notification Engine) queda reservado, no resuelto**, para no romper el contrato cuando ese motor exista.

---

## 2. Estructura completa (nivel raíz)

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `storyId` | Sí | string | Identificador único de la historia. |
| `schemaVersion` | Sí | string | Versión del contrato (no del contenido). |
| `metadata` | Sí | objeto | Datos descriptivos generales (§3). |
| `storyMood` | Sí | objeto | Referencia al mood asignado (§4). |
| `unlockRulesDefault` | Sí | objeto | Regla de desbloqueo por defecto (§7). |
| `chapters` | Sí | lista de Chapter | Al menos un capítulo (§5). |
| `specialChapter` | No | Chapter especial | El capítulo que "rompe todas las reglas" (§6). |
| `baseCopy` | Sí | objeto | Textos base neutrales (§11). |
| `placesCatalog` | No | objeto | Restaurantes y cafeterías sugeridas (§9). |
| `photoSpots` | No | lista de PhotoSpot | Puntos fotográficos sugeridos (§8). |
| `budget` | No | objeto | Presupuesto de referencia (§12). |
| `checklist` | No | lista | Ítems de preparación pre-viaje (§13). |
| `mapConfig` | No | objeto | Configuración de vista del mapa (§14). |
| `assets` | No | objeto | Imágenes de identidad de la historia completa (§15). |
| `invitationContent` | No | objeto | Copy de apoyo para la pantalla de invitación/acceso (§16). |

---

## 3. `metadata`

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `destination` | Sí | string | Ej. `"Buenos Aires"`. |
| `title` | Sí | string | Título narrativo de la historia. |
| `travelDates.start` | Sí | fecha | Primer día del viaje. Referencia para los desbloqueos. |
| `travelDates.end` | Sí | fecha | Último día del viaje "estándar". |
| `travelerNames` | No | lista de string | Nombres de los protagonistas, si la historia se personaliza por nombre. |
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

Solo `primary` es obligatorio.

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
| `assets` | No | objeto | Imágenes propias del capítulo (§15) — en particular, `lockedPreviewImage` es la imagen que se muestra mientras este capítulo sigue bloqueado, y nunca debe adelantar contenido. |

### 5.1 `activities` (actividades)

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `title` | Sí | string | Ej. `"Caminata por el Obelisco"`. |
| `description` | No | string | Texto narrativo, en tono de propuesta, nunca de tarea. |
| `timeWindow` | No | string | Ej. `"09:00–10:30"`. Orientativo. |
| `category` | No | string | Ej. `"gastronomía"`, `"caminata"`, `"cultura"`. Libre, no un enum cerrado. |
| `relatedPlaceId` | No | string | Si la actividad ocurre en un lugar ya definido en `placesCatalog`, se referencia por id en vez de repetir sus datos (ver §10). |
| `location.name` | No | string | Nombre del lugar. |
| `location.coordinates` | No | objeto | Coordenadas, si existen. |
| `location.googleMapsUrl` | No | string | Link directo para abrir el lugar en Google Maps. |
| `location.uberDeepLink` | No | string | Deep link para pedir un viaje en Uber hacia el lugar. |
| `location.cabifyDeepLink` | No | string | Deep link equivalente para Cabify. |
| `websiteUrl` | No | string | Sitio web del lugar o de la experiencia, si existe. |

Nunca existe un campo `required: true` en una actividad — las actividades son propuestas, nunca tareas obligatorias.

### 5.2 `suggestedMemories` (recuerdos sugeridos)

Contenido curado por el autor — no confundir con las Memorias reales que captura el viajero (esas pertenecen a Memory Engine y no viven en el Story Package).

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `id` | Sí | string | Identificador único. |
| `relatedActivityId` | No | string | A qué actividad se asocia. |
| `type` | Sí | string | `"photo"`, `"video"` o `"note"`. |
| `prompt` | Sí | string | Por qué este recuerdo importaría con los años. |

---

## 6. `specialChapter` (capítulo especial — ej. cumpleaños)

Hereda **toda** la estructura de `Chapter` (incluido `assets`), más:

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `breaksNarrativeRules` | Sí | objeto | `{ hasSchedule: false, hasMap: false, hasItinerary: false }`. |
| `prompts` | Sí | lista de string | Ej. `"reflexión"`, `"carta"`, `"mejor momento"`, `"mejor fotografía"`, `"restaurante favorito"`, `"cafetería favorita"`. **Sin ningún prompt de calificación.** |

Opcional a nivel de schema: una historia futura con otro Story Mood podría no tener un capítulo que rompa las reglas.

---

## 7. `unlockRulesDefault` y `unlockRule`

```
unlockRulesDefault: {
  requiresDateReached: true,
  requiresPreviousChapterCompleted: true
}
```

- `requiresDateReached`: el capítulo no pasa a disponible hasta que la fecha real alcance la fecha calculada del capítulo.
- `requiresPreviousChapterCompleted`: además necesita que el capítulo anterior esté finalizado.

Un capítulo puede sobrescribir esto en su propio `unlockRule`. Es la traducción genérica de las fechas fijas que antes vivían en `07_Business_Rules.md`/`08_State_machine.md`.

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
| `recommendation` | No | string | Texto cualitativo — **reemplaza cualquier puntaje numérico.** |
| `priceRange` | No | string | Ej. `"$$"`. Orientativo. |
| `relatedChapterId` | No | string | Si está sugerido para un día en particular. |

---

## 10. Regla de no duplicación (lugares)

Ningún lugar necesita repetirse: una actividad puede referenciar un `Place` ya existente en `placesCatalog` mediante `relatedPlaceId` en vez de repetir nombre, links y recomendación. Esto es lo que evita, por ejemplo, tener que escribir los datos de "El Cuartito" dos veces si aparece tanto en `placesCatalog.cafes` como en la actividad de un capítulo.

---

## 11. `baseCopy` (copy base)

Copy neutral de respaldo — el copy final resulta de combinarlo con las reglas de tono del Story Mood asignado (responsabilidad de ese dominio).

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `welcomeMessage` | Sí | string | Mensaje de bienvenida neutral. |
| `dailyOpenTemplate` | Sí | string | Plantilla neutral para abrir un capítulo. |
| `dailyCloseTemplate` | Sí | string | Plantilla neutral para cerrar un capítulo. |
| `finalLetter` | No | string | Carta de cierre, si la historia la incluye. |
| `anniversaryMessage` | No | string | Plantilla para el mensaje anual. |
| `notificationCopy` | No | objeto | Reservado para el futuro Notification Engine — sin consumidor hoy. |

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

## 13. `checklist` (opcional)

```
checklist: [
  { id: "chk-1", category: "Documentos", label: "Pasaportes" }
]
```

## 14. `mapConfig` (opcional)

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `centerCoordinates` | No | objeto | Punto central por defecto del mapa. |
| `defaultZoom` | No | número | Nivel de zoom inicial. |

Los pines **no se listan acá** — se derivan de los `location` de actividades, photo spots y lugares.

---

## 15. `assets` (nuevo — imágenes de la historia y de cada capítulo)

Misma forma reutilizada en dos niveles: a nivel raíz (identidad general de la historia — invitación, biblioteca de historias a futuro) y dentro de cada `chapter`/`specialChapter` (portada e imagen de bloqueo de ese día en particular).

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `heroImage` | No | string (ruta o URL) | Imagen principal/portada. |
| `thumbnailImage` | No | string | Miniatura para listados. |
| `galleryImages` | No | lista de string | Imágenes editoriales de acompañamiento — **contenido curado por el autor, nunca Memorias reales del viajero.** |
| `lockedPreviewImage` | No | string | Imagen mostrada mientras el contenido real sigue bloqueado. Debe ser genérica y **nunca puede adelantar contenido** — es la aplicación directa de la regla anti-spoiler a nivel de asset visual. |

---

## 16. `invitationContent` (nuevo — copy de apoyo para la entrada a la historia)

Este bloque es **solo contenido**. No decide ni verifica nada — provee las palabras que Story Access puede usar en sus propias pantallas (invitación, QR, instalación).

| Campo | Obligatorio | Tipo | Descripción |
|---|---|---|---|
| `invitationTitle` | No | string | Título de la tarjeta/invitación de entrada. |
| `invitationMessage` | No | string | Mensaje personalizado de invitación. |
| `qrLandingCopy` | No | string | Texto que ve quien escanea el QR, antes de instalar. |
| `installPromptCopy` | No | string | Texto que acompaña el paso de instalación. |

---

## 17. Frontera con Story Access (regla explícita)

**Story Package define contenido. Story Access define quién puede verlo.**

En consecuencia, este contrato **no contiene, y nunca debe contener**: tokens, contraseñas, claves de invitación, listas de accesos concedidos, ni ninguna forma de permiso. `invitationContent` (§16) es la única superficie de contacto entre ambos dominios, y es exclusivamente texto — la lógica de "quién entra" vive enteramente en Story Access, tal como se definió en `DOMAIN_MODEL.md`.

Si alguna vez se siente la tentación de agregar un campo como `accessPassword` o `invitedEmails` a este contrato, es una señal de que esa lógica se está filtrando al dominio equivocado.

---

## 18. Campos deliberadamente ausentes de este contrato

- **`rating` / calificación**, en cualquier nivel.
- **Tokens, contraseñas, permisos o cualquier mecanismo de autorización** (ver §17).
- **Progreso del viajero.** Pertenece a Story Progress.
- **Memorias reales capturadas.** Pertenecen a Memory Engine.
- **Identidad del viajero.** Pertenece a Traveler Identity.
- **Reglas de tono del Story Mood.** Pertenecen al catálogo de ese dominio.

---

## 19. Ejemplo mínimo (skeleton genérico, sin contenido real)

```
{
  "storyId": "story-generic-001",
  "schemaVersion": "1.1",
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

Esto es, a propósito, lo mínimo que el Story Engine necesita para no romperse. Todo lo demás — links, assets, invitationContent — es enriquecimiento opcional.

## 20. Ejemplo completo — Buenos Aires 2026 (corregido)

```
{
  "storyId": "story-ba-2026",
  "schemaVersion": "1.1",
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
  "assets": {
    "heroImage": "images/cover-hero.jpg",
    "thumbnailImage": "images/cover-thumb.jpg"
  },
  "invitationContent": {
    "invitationTitle": "Una historia te está esperando",
    "invitationMessage": "Escaneá este código cuando estemos por llegar a Buenos Aires.",
    "qrLandingCopy": "Antes de instalar nada, respirá un segundo. Esto no es una app. Es el comienzo de un recuerdo.",
    "installPromptCopy": "Agregá esto a tu pantalla de inicio. Va a estar ahí durante todo el viaje."
  },
  "chapters": [
    {
      "id": "chapter-1",
      "order": 1,
      "title": "La llegada",
      "assets": { "heroImage": "images/dia1-hero.jpg", "lockedPreviewImage": "images/dia1-locked.jpg" },
      "activities": [
        {
          "id": "act-1-1",
          "title": "Desayuno en el hotel",
          "description": "Desayuno incluido en la estadía — sin apuro, el primer respiro del viaje.",
          "timeWindow": "08:00–09:30",
          "category": "gastronomía"
        },
        {
          "id": "act-1-2",
          "title": "Obelisco y Av. Corrientes",
          "category": "caminata",
          "location": {
            "name": "Obelisco de Buenos Aires",
            "googleMapsUrl": "https://maps.google.com/?q=Obelisco+Buenos+Aires"
          }
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
    {
      "id": "chapter-2",
      "order": 2,
      "title": "La ciudad se siente familiar",
      "activities": [
        {
          "id": "act-2-1",
          "title": "Medialunas en El Cuartito",
          "description": "Una parada que se va a volver leitmotiv del viaje.",
          "category": "café",
          "relatedPlaceId": "cafe-cuartito"
        }
      ]
    },
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
      "location": {
        "name": "Av. Corrientes y Av. 9 de Julio",
        "googleMapsUrl": "https://maps.google.com/?q=Av+Corrientes+y+9+de+Julio"
      },
      "bestTime": "09:00 a 10:30",
      "tip": "La luz de la mañana deja la avenida casi vacía."
    }
  ],
  "placesCatalog": {
    "restaurants": [
      {
        "id": "rest-cabrera",
        "name": "La Cabrera",
        "recommendation": "El lugar para una cena larga y sin apuro.",
        "location": { "googleMapsUrl": "https://maps.google.com/?q=La+Cabrera+Palermo" },
        "websiteUrl": "https://parrillalacabrera.com.ar"
      }
    ],
    "cafes": [
      {
        "id": "cafe-cuartito",
        "name": "El Cuartito",
        "recommendation": "Medialunas que se volvieron parte de la historia.",
        "location": { "googleMapsUrl": "https://maps.google.com/?q=El+Cuartito+Buenos+Aires" }
      }
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

Cambios respecto a la versión anterior: el Día 1 ahora abre con el desayuno del hotel (contenido real e incluido en la estadía), y las medialunas de El Cuartito pasan a ser una experiencia propia del Día 2, referenciando `placesCatalog` por `relatedPlaceId` en vez de duplicar sus datos.

---

## 21. Por qué este contrato ya soporta múltiples historias

Ninguno de los ejemplos anteriores requiere que el motor sepa que existe "Buenos Aires" o "Kari" — ambos son instancias válidas de la misma forma, incluyendo sus links, assets y copy de invitación. Agregar Bariloche 2027 es escribir un tercer documento con esta misma estructura.

---

*Sin código, sin cambios al repositorio. A la espera de aprobación antes de iniciar el Paso 1 del plan de migración (extracción del contenido actual a este contrato).*
