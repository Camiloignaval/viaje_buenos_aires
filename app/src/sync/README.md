# sync

**Qué es:** la capa de sincronización real de Aurora (Épica 5 — Persistencia Real). Le permite a una historia vivir en más de un dispositivo, con el backend como respaldo — pero nunca como requisito: sin backend configurado o sin red, Aurora sigue funcionando 100% local, exactamente como en las Épicas 1-4.

**Responsabilidad de cada archivo:**
- `syncMerge.js` — función pura: dos estados (local y remoto) → un estado fusionado. Progreso de capítulos: gana el más avanzado (nunca retrocede — regla que ya vive en `storyProgress.js`). Memorias: se combinan por `id`; si la misma existe en los dos lados, gana la más reciente por `updatedAt`. Es la MISMA función que corre en `api/aurora/sync.js` (servidor) — se prueba una sola vez.
- `syncClient.js` — el único archivo de esta carpeta que toca red/`localStorage`/`fetch` (paralelo a `experienceView.js`). Guarda el `accessToken` que llega por `?token=` en la URL, sube a Cloudinary las fotos todavía locales, y llama a `/api/aurora/sync`. Cualquier falla (sin token, sin red, backend caído) se traga en silencio — nunca rompe la experiencia local.

**Qué NO hace:**
- No resuelve conflictos campo por campo ni es un CRDT — la estrategia es deliberadamente simple (ver arriba), suficiente para el volumen y la concurrencia real de una app personal.
- No decide qué historia mostrar: si `?token=` corresponde a una historia distinta de la que ya viene empaquetada en este build de Aurora (`story-ba2026.json`), sincroniza igual pero la experiencia sigue mostrando la historia empaquetada — cargar dinámicamente OTRO Story Package publicado es una decisión de arquitectura más grande, todavía no tomada.
- No borra las fotos de IndexedDB una vez subidas a Cloudinary — quedan como respaldo local redundante (decisión deliberada: menos riesgo que borrar de más).

**Dominios que conoce:** `progressStore`, `memoryStore`, `photoStore` (para leer/escribir el estado local que se sincroniza).

**Dominios que no debe conocer:** Story Package, Story Engine, Presentation. No sabe nada de capítulos, prompts ni cómo se ve nada — solo mueve datos.

**Backend (Vercel, `api/aurora/*.js`):**
- `api/aurora/story.js` — `GET` (leer una historia publicada por `storyId`+`token`) / `POST` (Aurora Studio: publicar, protegido por `AURORA_ADMIN_PASSWORD`).
- `api/aurora/sync.js` — `POST`: fusiona y persiste progreso + Memorias.
- `api/aurora/photo-upload.js` — `POST`: sube una foto a Cloudinary, en la carpeta `aurora/<storyId>`.

Los tres responden `503` si `MONGODB_URI` no está configurada — nunca crashean el proceso al arrancar (el chequeo es lazy, dentro del handler, igual que en `lib/mongodb.js`).

**Mongo compartido con el prototipo viejo:** Aurora usa la misma `MONGODB_URI` que `lib/mongodb.js` (antes eran variables separadas, `AURORA_MONGODB_URI` vs `MONGODB_URI` — unificadas para no mantener dos). Reutiliza la MISMA cuenta de Cloudinary que el prototipo viejo (`CLOUDINARY_*`), pero en su propia carpeta — no hace falta una cuenta nueva.
