# memory

**Qué es:** la base del dominio Memory Engine — el modelo `Memory` unificado (nunca "de tipo nota" o "de tipo foto") y las operaciones para crearla, leerla, marcarla favorita y archivarla. Persistido localmente, namespaced por `storyId`.

**Responsabilidad:**
- `memoryStore.js` — crear una Memoria con nota (y, desde la Épica 3, con `photos`), leer las Memorias de una historia, invertir su estado de favorita, archivarla. Guarda solo metadata en `localStorage`.
- `photoStore.js` (Épica 3) — guarda y lee los `Blob` reales de las fotos en IndexedDB. `memoryStore.js` nunca importa este archivo; quien conecta ambos (guardar el Blob, tomar el id, ponerlo en `photos[]`) es `experienceView.js`.

**Qué NO hace:**
- No sube nada a un backend — no conoce Cloudinary ni MongoDB. Todo vive en el navegador (`localStorage` + IndexedDB).
- No comprime ni optimiza imágenes — se guarda el archivo tal cual lo entrega el input (decisión explícita de la Épica 3: eso queda para una fase futura).
- `videos` sigue reservado (vacío) — la Épica 3 solo implementó fotos.
- No elimina Memorias — `archiveMemory` solo marca `archived: true`; el dato nunca se borra del storage.
- No sabe nada de Album Engine, Notification Engine, Story Mood ni Story Profiling.

**Dominios que conoce:** ninguno de Story — `storyId`, `chapterId` y `activityId` son simples strings para este módulo, nunca objetos de Story Package. Es deliberadamente más aislado que `progressStore` (que sí depende de `ChapterStatus`).

**Dominios que no debe conocer:** Story Package, Story Engine, Story Progress, Media Storage (real, con backend), Album Engine, Presentation.

**Aislamiento:**
- `memoryStore.js` — storage inyectable (`{ getItem, setItem }`, por defecto `localStorage`), igual patrón que `progressStore`. `createNoteMemory` recibe `photos`/`storage` en un objeto de opciones (no posicional) para no romper por confusión de orden. Se prueba con un storage simulado en memoria.
- `photoStore.js` — usa `indexedDB` real (API nativa del navegador, sin librerías). Se prueba con [`fake-indexeddb`](https://www.npmjs.com/package/fake-indexeddb) (solo `devDependency`, importado únicamente desde el test — nunca desde código de producción).

**Por qué IndexedDB para las fotos y no `localStorage`:** `localStorage` es síncrono, solo guarda strings y tiene ~5-10MB de cuota total para todo el origen — una sola foto de celular en base64 puede ocupar varios MB y bloquear el hilo principal al guardarla. IndexedDB es asíncrono, guarda `Blob` nativos (sin la expansión ~33% de base64) y el cupo real es muchísimo mayor. Los Blob URLs (`URL.createObjectURL`) no sirven como storage — son referencias de memoria que no sobreviven un reload; `experienceView.js` los genera de nuevo en cada render a partir de lo guardado en IndexedDB.
