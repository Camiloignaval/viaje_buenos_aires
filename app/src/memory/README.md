# memory

**Qué es:** la base del dominio Memory Engine — el modelo `Memory` unificado (nunca "de tipo nota" o "de tipo foto") y las operaciones para crearla, leerla, marcarla favorita y archivarla. Persistido localmente, namespaced por `storyId`.

**Responsabilidad:** `memoryStore.js` — crear una Memoria con nota, leer las Memorias de una historia, invertir su estado de favorita, archivarla.

**Qué NO hace:**
- No sube fotos ni videos, no conoce Cloudinary ni MongoDB — `photos`/`videos` existen en el modelo pero quedan vacíos hasta que existan esas fases.
- No elimina Memorias — `archiveMemory` solo marca `archived: true`; el dato nunca se borra del storage.
- No se conecta a ninguna UI todavía — no hay integración con `experience.html` ni `main.js` en esta fase.
- No sabe nada de Album Engine, Notification Engine, Story Mood ni Story Profiling.

**Dominios que conoce:** ninguno de Story — `storyId`, `chapterId` y `activityId` son simples strings para este módulo, nunca objetos de Story Package. Es deliberadamente más aislado que `progressStore` (que sí depende de `ChapterStatus`).

**Dominios que no debe conocer:** Story Package, Story Engine, Story Progress, Media Storage, Album Engine, Presentation.

**Aislamiento:** storage inyectable (`{ getItem, setItem }`, por defecto `localStorage`) — mismo patrón que `progressStore` (Fase 5), pero sin copiar código porque las formas de dato son distintas. Se prueba con un storage simulado en memoria (`memoryStore.test.js`), nunca contra un Story Package real ni contra `localStorage` real.
