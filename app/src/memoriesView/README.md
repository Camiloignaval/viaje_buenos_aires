# memoriesView

**Qué es:** una herramienta de desarrollo interna para crear, favoritear y archivar Memorias de verdad contra `memoryStore.js`, sin depender de fechas ni de progreso. Se abre en `/memories.html`, separado por completo de la app real.

**Qué NO es:**
- No es UI final ni un paso hacia la experiencia real de Aurora — sin voz de marca, sin estilo de `06_Brand_Book.md`.
- No respeta el orden narrativo de capítulos — permite crear una nota en cualquier capítulo, disponible o no; es para probar el motor libremente, no la experiencia real.
- No se integra con `experience.html` ni con `main.js`.
- No sube fotos ni videos, no conoce Cloudinary ni MongoDB.

**Qué reutiliza:** `loadStoryPackage`, `story-ba2026.json` y las cuatro funciones de `memoryStore.js`, todos sin modificar.

**Cómo se usa:** `npm run dev` y abrir `/memories.html`.
