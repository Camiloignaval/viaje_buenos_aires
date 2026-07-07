# progressStore

**Responsabilidad:** cargar, guardar y actualizar el progreso de capítulos de una historia (`chapterId → estado`), namespaced por `storyId`, en un storage inyectable (por defecto `localStorage`).

**Qué NO hace:**
- No valida el Story Package ni calcula qué capítulo debería estar disponible — eso es Story Progress / Story Engine.
- No sincroniza con ningún backend — el progreso vive solo en este dispositivo.
- No persiste Memorias reales (fotos, videos, notas) — eso, cuando exista, es Memory Engine.
- No exige que un capítulo haya pasado por `started` antes de `completed`, ni que el epílogo tenga sus prompts respondidos — simplificación aceptada para esta fase, a endurecer cuando exista Memory Engine.

**Dominios que conoce:** `ChapterStatus` de Story Progress (para no inventar sus propios strings de estado).

**Dominios que no debe conocer:** Story Package, Story Engine, Memory Engine, Presentation. No sabe cómo se ve nada ni por qué se guarda.

**Nota de alcance:** esto es el cimiento mínimo de lo que `DOMAIN_MODEL.md` llama Synchronization — no implementa su semántica completa (reintentos, cola offline, backend). Es deliberadamente pequeño.

**Aislamiento:** cada función recibe el storage como parámetro inyectable (`{ getItem, setItem }`) — se prueba con un storage simulado en memoria (`progressStore.test.js`), nunca contra `localStorage` real ni contra el Story Package real.
