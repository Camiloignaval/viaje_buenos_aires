# debug

**Qué es:** una herramienta de desarrollo interna para verificar que Story Package + Story Progress + Story Engine funcionan juntos, simulando fecha y progreso a mano. Se abre en `/debug.html`, separado por completo de la app real.

**Qué NO es:**
- No es el inicio de la UI real de Aurora — no tiene estilo de marca ni sigue el vocabulario de `06_Brand_Book.md`, y no debería usarse como referencia de diseño.
- No persiste nada — el progreso simulado vive solo en memoria del navegador mientras la página está abierta; al recargar, se pierde.
- No es un dominio reutilizable para otras historias — `scenarios.js` conoce a propósito los ids de capítulos de Buenos Aires 2026, porque existe únicamente para demostrar esta historia.

**Qué reutiliza:** `storyPackage.js`, `storyEngine.js`, `storyProgress.js` y `story-ba2026.json`, todos sin modificar.

**Cómo se usa:** `npm run dev` y abrir `/debug.html`.
