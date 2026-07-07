# IMPLEMENTATION_PHASE_7.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Séptima fase de implementación — Memory Engine base (solo notas, solo local).
**Estado:** Propuesta — sin código escrito todavía. A la espera de aprobación.

---

## Objetivo de la fase

Construir la base del dominio Memory Engine: un modelo de Memoria unificado y las operaciones mínimas para crearla (de tipo nota), leerla, marcarla como favorita y archivarla — todo persistido localmente, sin ningún archivo (foto/video) todavía. Es un módulo de dominio puro, sin conexión a ninguna UI en esta fase.

## Alcance

**Incluido en esta fase:**
- El modelo `Memory` unificado (no separado en "tipos" — ver Decisión 1).
- Crear una Memoria con nota.
- Asociarla a `storyId` (obligatorio), `chapterId` (obligatorio), `activityId` (opcional).
- Persistir en `localStorage`, namespaced por `storyId`.
- Leer las Memorias de una historia.
- Marcar/desmarcar favorita.
- Archivar (nunca eliminar de verdad).

**Explícitamente fuera de esta fase (confirmado por tus restricciones):**
- Subida de fotos o videos, Cloudinary, MongoDB.
- Album Engine.
- Cualquier UI real — este módulo no se conecta a `experience.html` ni a `main.js` en esta fase. Como permitiste, propongo la conexión visual como una **fase futura separada** (ver "Qué queda pendiente"), no acá.

## Decisiones que quiero confirmar antes de programar

1. **El modelo `Memory` no tiene un campo `type`.** Según `DOMAIN_MODEL.md`, una Memoria es un contenedor que puede tener 0+ fotos, 0+ videos y una nota opcional — no es "de tipo nota" o "de tipo foto", es una sola entidad que en esta fase solo llega a tener nota (fotos/videos quedan como arrays vacíos, reservados). Esto evita rediseñar el modelo cuando lleguen las fases de foto/video — se completan los mismos campos, no se agregan tipos nuevos.
2. **Nueva carpeta de dominio: `app/src/memory/`**, no adentro de `app/src/story/`. Memory Engine es un dominio propio según `DOMAIN_MODEL.md`, y de hecho no necesita importar nada de `story/` — `chapterId` y `activityId` son simples strings para este módulo, nunca objetos de Story Package. Es, incluso, más aislado que `progressStore` (que sí depende de `ChapterStatus`).
3. **`loadMemories` oculta las archivadas por defecto** (`includeArchived` opcional). "Nunca eliminar" no significa "seguir mostrando para siempre" — arquitectónicamente son cosas distintas.
4. **`toggleFavorite` es una sola función simétrica**, no `markFavorite`/`unmarkFavorite` separadas — coherente con que sea una preferencia reversible del viajero, no un estado con reglas de una sola dirección (a diferencia de `started`/`completed`, que sí son sticky).
5. **Los ids de Memoria se generan con `crypto.randomUUID()`** — disponible nativamente en Node y en el navegador, cero dependencias nuevas.
6. **Mismo patrón de storage inyectable que `progressStore`** (Fase 5): cada función recibe `{ getItem, setItem }`, por defecto `window.localStorage`. Clave: `aurora:memories:${storyId}`, guardando un array de Memorias.

## Qué archivos crearás

| Archivo | Responsabilidad única |
|---|---|
| `app/src/memory/memoryStore.js` | Crear, leer, marcar favorita y archivar Memorias, persistidas en un storage inyectable. |
| `app/src/memory/memoryStore.test.js` | Creación, asociación de ids, namespacing, round-trip, favorito ida y vuelta, archivar sin eliminar, JSON corrupto. |
| `app/src/memory/README.md` | Responsabilidad / qué no hace / dominios que conoce / dominios que no debe conocer. |

## Qué archivos modificarás

Ninguno. Cero conexión con `experienceView.js`, `render.js` o `main.js` en esta fase.

## Qué componentes crearás

- **Memory Store**: `createNoteMemory`, `loadMemories`, `toggleFavorite`, `archiveMemory` — el modelo `Memory` completo (con `photos: []` y `videos: []` reservados) vive acá, aunque esta fase solo llene `note`.

## Qué componentes reutilizarás

- El patrón de storage inyectable + clave namespaced ya validado en `progressStore` (Fase 5) — mismo enfoque, dominio distinto, sin copiar código porque las formas de dato son diferentes.
- `crypto.randomUUID()`, nativo.

## Qué riesgos existen

- **`localStorage.setItem` sin try/catch** — mismo riesgo ya aceptado en la Fase 5, no resuelto ahora tampoco.
- **El array de Memorias crece para siempre** — como nunca se elimina de verdad (solo se archiva), con el tiempo puede acumularse mucho en `localStorage`. Aceptable en esta fase; una fase de Synchronization real con backend es donde esto se resuelve de fondo.
- **Sin límite de longitud de nota** — coherente con `07_Business_Rules.md` ("las notas no tienen límite práctico de longitud"), pero vale la pena tenerlo presente si algún día se sincroniza con un backend con límites propios.
- **Módulo sin consumidor todavía** — igual que pasó brevemente con `progressStore` antes de conectarlo en la misma fase que lo creó, acá la conexión queda pendiente a propósito, porque así lo definiste.

## Cómo validaremos que la fase quedó terminada

- `npm test` sigue en verde, incluyendo los casos nuevos de `memoryStore.test.js`:
  - Crear una Memoria de nota guarda `storyId`, `chapterId`, `activityId` (o `null` si no se pasó), `note`, `favorite: false`, `archived: false`, `photos: []`, `videos: []`.
  - `loadMemories` hace round-trip y respeta el namespacing por `storyId` (dos historias no se pisan).
  - `toggleFavorite` cambia de `false` a `true` y de vuelta a `false`.
  - `archiveMemory` marca `archived: true` sin quitar la Memoria del storage; `loadMemories` la oculta por defecto pero `loadMemories(storyId, storage, { includeArchived: true })` la sigue mostrando.
  - JSON corrupto en el storage no rompe, devuelve `[]`.
- `git status` no muestra ningún archivo modificado — solo los tres nuevos.
- Cero menciones a Buenos Aires o a Story Package dentro de `memoryStore.js`.

## Qué queda pendiente para la siguiente fase

- **Conectar Memory Store a una vista aislada** (propuesta para una Fase 8): un lugar simple, separado de `experience.html`, para probar visualmente crear/favoritear/archivar una nota — antes de integrarlo a la experiencia real.
- Soporte real de fotos/videos (Media Storage, Cloudinary) — llenando los mismos campos `photos`/`videos` ya reservados en el modelo.
- Conectar las `suggestedMemories` del Story Package con este módulo, para que dejen de ser texto y se puedan capturar de verdad.
- Album Engine, una vez que haya Memorias reales que ensamblar.

---

*Sin código escrito. A la espera de tu aprobación — en particular de las 6 decisiones de arriba — antes de crear el primer archivo.*
