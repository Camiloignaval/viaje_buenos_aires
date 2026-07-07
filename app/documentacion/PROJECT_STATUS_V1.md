# PROJECT_STATUS_V1.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Fotografía completa del proyecto Aurora al cierre de la Fase 9.
**Estado:** Documento de referencia — nuevo punto de partida antes de seguir construyendo. Sin código.

---

## 1. Qué dominios existen (según `DOMAIN_MODEL.md`)

| Dominio | Estado | Dónde vive |
|---|---|---|
| **Story Package** | Contrato definido (v1.4) + una instancia real (Buenos Aires 2026) | `app/src/story/storyPackage/`, `app/src/story/data/story-ba2026.json` |
| **Story Progress** | Completo para v1 | `app/src/story/storyProgress/` |
| **Story Engine** | Completo para v1 | `app/src/story/storyEngine/` |
| **Synchronization** | Parcial — solo progreso de capítulos, solo local | `app/src/story/progressStore/` |
| **Memory Engine** | Parcial — solo notas, solo local | `app/src/memory/` |
| **Album Engine** | No existe | — |
| **Notification Engine** | No existe (declarado futuro desde `TECHNICAL_ARCHITECTURE.md`) | — |
| **Location Awareness** | No existe (declarado futuro) | — |
| **Story Mood** | Solo como dato fijo en el Story Package (`"romantic"`) — no hay motor de tono | — |
| **Story Profiling / Story Authoring** | No existen — Buenos Aires 2026 se autoría a mano | — |
| **Story Access / Traveler Identity** | No existen — todas las páginas son de acceso abierto | — |
| **Media Storage** | No conectado al motor nuevo (existe una versión vieja en `app/api`/`app/lib`, atada al modelo legado, no a Memory Engine) | — |
| **Maps** | No existe como capacidad — solo hay links a Google Maps como texto | — |

## 2. Qué módulos existen (nivel de archivo)

```
app/src/story/
├── storyPackage/     — carga y valida la forma del Story Package
├── storyProgress/    — máquina de estados de capítulos (incluye el epílogo)
├── storyEngine/       — combina Package + Progress en un StoryView
├── progressStore/    — persiste started/completed por capítulo (localStorage)
└── data/              — story-ba2026.json (el único Story Package real hoy)

app/src/memory/
└── memoryStore.js     — crea/lee/favoritea/archiva Memorias (solo notas hoy)

app/src/experience/
├── render.js           — StoryView → HTML (función pura)
├── chapterContent.js   — resuelve lugares/photo spots/colecciones de un capítulo
├── experienceView.js   — único archivo con efectos secundarios de esta carpeta
└── experience.css      — estilos de la experiencia real

app/src/debug/           — herramienta de desarrollo para Story Engine
app/src/memoriesView/    — herramienta de desarrollo para Memory Engine
```

Cada módulo de dominio (`story/*`, `memory/`) tiene su propio README con responsabilidad / qué no hace / dominios que conoce y no debe conocer — son la fuente de verdad más detallada, este documento no los reemplaza.

## 3. Qué páginas existen

| Página | Qué es | Estado |
|---|---|---|
| `app/experience.html` | La experiencia real de Aurora — voz de marca, Story Engine real, Memory Engine (notas) integrado | Activa, es el foco de las últimas 6 fases |
| `app/debug.html` | Herramienta de desarrollo: simula fecha/progreso para ver los 4 `currentMode` | Activa, de uso interno |
| `app/memories.html` | Herramienta de desarrollo: crear/favoritear/archivar Memorias sin pasar por la experiencia real | Activa, de uso interno |
| `app/index.html` + `app/src/main.js` | La mini-app Vite original (checklist, álbum, videos) — **congelada**, no recibe cambios desde la Fase 1 | Sin tocar, coexiste |
| `index.html` (raíz) | La guía estática original de Buenos Aires 2026 — **congelada** | Sin tocar, coexiste |

**Nota importante:** hoy conviven **tres experiencias distintas** de Buenos Aires 2026 (la guía estática, la mini-app legada, y `experience.html`). Ninguna reemplazó a las otras todavía — ese es un retiro pendiente, no un error.

## 4. Qué herramientas de desarrollo existen

- **`debug.html`**: simula `now` y el estado de cada capítulo con controles manuales y 5 escenarios preestablecidos, para inspeccionar el `StoryView` crudo.
- **`memories.html`**: crea/favoritea/archiva Memorias directamente, sin depender de fechas ni de progreso.
- **`?scenario=` en `experience.html`**: override de solo lectura (4 escenarios) para revisar visualmente los 4 `currentMode` sin esperar fechas reales — nunca escribe en `localStorage`.
- **Suite de pruebas**: `npm test` → `node --test "src/**/*.test.js"`, sin frameworks externos.

## 5. Qué funcionalidades ya están completas

- Validación mínima de un Story Package.
- Máquina de estados de capítulos, incluido el epílogo con fecha propia (nunca derivada de `travelDates.end`).
- `StoryView` completo (`currentMode`, `visibleChapter`, buckets de capítulos, `nextUnlock`, `specialChapterStatus`, `memoryModeAvailable`).
- Persistencia real de progreso de capítulos (local, por `storyId`), con botones reales de "Marcar como iniciado"/"Cerrar capítulo".
- Renderizado real y con voz de marca de los 4 `currentMode`.
- Tarjetas de actividad enriquecidas (descripción, categoría, ubicación, links, lugar relacionado).
- Photo spots, lugares relacionados y colecciones del capítulo visible (sin secciones vacías).
- Memory Engine base: crear nota, asociarla a capítulo/actividad, favoritear, archivar sin eliminar — todo persistido y ahora integrado en la experiencia real.
- Aislamiento estricto: nada de esto tocó `main.js`, y `?scenario=` nunca escribe datos reales.

## 6. Qué funcionalidades están parcialmente implementadas

- **Memory Engine**: solo notas. `photos`/`videos` existen en el modelo pero siempre vacíos — no hay forma de capturar un archivo todavía.
- **Capítulo especial (epílogo)**: se puede ver, iniciar y cerrar, pero sus prompts (`retrospective`/`creation`) siguen siendo texto — ninguno está conectado a Memory Engine todavía.
- **Sincronización**: existe, pero es 100% local (`localStorage`). No hay respaldo si se borra el navegador o se cambia de dispositivo.
- **Presentación**: `experience.html` cubre las 4 etapas narrativas, pero sin imágenes reales (`assets.heroImage`/`galleryImages` del Story Package no se usan todavía) y sin un sistema de diseño unificado — cada página tiene su propio CSS aislado.

## 7. Qué funcionalidades aún no existen

- Subida de fotos/videos, Cloudinary, cualquier Media Storage conectado al motor nuevo.
- Album Engine (ensamblar y mostrar lo capturado).
- Notification Engine, Location Awareness.
- Story Mood como motor de tono (hoy es un dato fijo, no algo que module el copy dinámicamente).
- Story Profiling, Story Authoring / Aurora Studio (crear una historia sigue siendo 100% manual).
- Story Access / Traveler Identity (sin login, sin invitación, sin multi-historia).
- PWA (manifest, instalación, ícono que evoluciona).
- Retiro del modelo legado (`index.html` raíz, `main.js`, `data.js`, `storage.js` siguen ahí, sin tocar).

## 8. Estado general del proyecto (aproximado)

**~35–40% de la visión completa de Aurora v1**, pero esa cifra sola engaña — depende muchísimo de qué se compare contra qué:

| Bloque | Avance aproximado |
|---|---|
| Núcleo del motor (Story Package + Progress + Engine) | **~100%** para lo que v1 necesita |
| Persistencia local (progreso + memorias) | **~60%** (falta backend/multi-dispositivo, explícitamente futuro) |
| Memory Engine | **~40%** (notas sí, fotos/videos no) |
| Experiencia real (`experience.html`) | **~65–70%** (narrativa completa, sin imágenes ni álbum) |
| Album / Notification / Location / PWA / Authoring / Access | **0%** (todo declarado futuro desde el principio, no es deuda) |
| Retiro del legado | **0%** (coexiste, no bloquea nada) |

El núcleo técnico (lo más riesgoso de construir mal) está sólido y probado. Lo que falta es, en su mayoría, superficie de producto ya prevista desde `TECHNICAL_ARCHITECTURE.md` como trabajo futuro, no arquitectura mal hecha.

## 9. Deuda técnica conocida

- `localStorage.setItem` sin try/catch en `progressStore` y `memoryStore` (cuota llena, modo incógnito).
- El array de Memorias crece para siempre — nunca se poda, solo se archiva.
- Sin límite de longitud de nota.
- `render.js` sigue creciendo como archivo de templates — ya se separó `chapterContent.js`, pero va a necesitar un sistema de diseño real en algún momento.
- CSS aislado y sin tokens compartidos entre `debug.html`, `experience.html` y `memories.html`.
- `loadStoryPackage` no verifica que `schemaVersion` coincida con lo que el motor espera en tiempo de ejecución.
- Sin CI ni lint automatizado — solo `npm test` corrido a mano en cada fase.
- Gaps de schema detectados durante la extracción de contenido y nunca resueltos: el hotel no tiene lugar propio en `placesCatalog`, Florería Atlántico quedó forzada como `restaurant` (es un bar), el contenido de "Plan B" de cada día no tiene campo, la memoria sugerida con `day: 0` original no encajaba bien en el modelo.

## 10. Riesgos conocidos

- **Pérdida de datos real:** todo el progreso y las Memorias viven solo en el `localStorage` del navegador — borrar caché o cambiar de dispositivo pierde todo. No hay respaldo.
- **Contenido pendiente del capítulo especial:** su estructura está aprobada, pero el contenido real de sus prompts (la carta, la reflexión) todavía no se escribió — y `invitationContent`/`anniversaryMessage` siguen siendo borrador.
- **Tres experiencias coexistiendo** de la misma historia (guía estática, mini-app legada, `experience.html`) — riesgo de confusión si alguien no sabe cuál es la vigente.
- **Sin pruebas end-to-end persistentes** — cada fase se validó en vivo con Playwright de forma manual, pero no queda un suite que corra solo; si algo se rompe entre fases, no hay red de seguridad automática más allá de `npm test` (que solo cubre lógica de dominio, no UI).

## 11. Próximas fases recomendadas (por prioridad)

1. **Conectar los prompts de creación del epílogo a Memory Engine.** Costo bajo (reutiliza todo lo ya construido), valor alto: cierra el capítulo emocionalmente más importante de la historia.
2. **Fotos (Media Storage / Cloudinary) para Memory Engine.** Sin esto, "Memoria" se siente incompleta frente a la promesa central del producto — las notas solas no bastan.
3. **Persistencia real en backend**, reutilizando la infraestructura de MongoDB ya existente (`app/api`/`app/lib`), para eliminar el riesgo de pérdida total de datos.
4. **Album Engine mínimo**, una vez que haya fotos y notas reales que ensamblar.
5. **Retiro gradual del legado** (`index.html` raíz, `main.js`, `data.js`, `storage.js`) cuando `experience.html` alcance paridad funcional suficiente.
6. **PWA** (manifest, instalación, ícono evolutivo) — es la forma real en que alguien "recibe" Aurora, según la documentación de producto.
7. Más adelante, sin urgencia: Notification Engine, Location Awareness, Story Access real, Story Profiling/Authoring, soporte multi-historia.

---

*Sin código. Este documento reemplaza a los reportes de fase individuales como referencia de estado — a partir de acá, cualquier fase nueva se planifica contra esta fotografía, no contra la memoria de la conversación.*
