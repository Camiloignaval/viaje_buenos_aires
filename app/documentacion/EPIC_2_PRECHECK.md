# Épica 2 — Precheck de Auditoría

**Objetivo:** encontrar todo lo que "se ve como prototipo" en el proyecto (no funcionalidades nuevas). Auditoría hecha con lectura y grep exhaustivo de código, CSS y documentación — sin modificar nada todavía.

## Hallazgos

### 1. Backend legado (Cloudinary/Mongo) — NO es código muerto
`app/api/`, `app/lib/`, y las dependencias `cloudinary`/`mongodb` en `app/package.json:16-17` son un backend serverless **completo pero nunca desplegado**, usado exclusivamente por el prototipo original (`app/index.html` → `main.js` → `storage.js`/`auth.js`/`image.js`). No es deuda de "código huérfano": es una vía alternativa congelada, ya reconocida como tal en `PROJECT_STATUS_V1.md:24`.
**Acción: ninguna.** `main.js` y todo lo que depende de él está protegido por la regla vigente "nunca tocar main.js" — se documenta, no se toca ni se borra.

### 2. TODO/FIXME/HACK
Sin hallazgos. No hay comentarios de este tipo en `app/src/**/*.js` ni en ningún `*.html`.

### 3. Tres sistemas visuales conviviendo
- `app/src/style.css` (prototipo viejo, morado/Segoe UI) — protegido, no se toca.
- `app/src/experience/experience.css` (Aurora, cálido/Georgia) — es el real, correcto.
- `<style>` inline en `debug.html`/`memories.html` — paleta utilitaria (amarillo de aviso, `system-ui`).
**Colisión de nombre:** `.section-title` existe en `style.css:97` y en `experience.css:183` con reglas distintas. No genera bug (páginas separadas, nunca se cargan juntas).
**Evaluación:** la paleta utilitaria de `debug.html`/`memories.html` es intencional — son herramientas internas que deliberadamente no deben parecerse a la UI real (mismo criterio que el `.dev-banner` de `experienceView.js`). Unificarla sería un error, no una mejora.
**Acción: documentar la colisión de `.section-title` como conocida e inofensiva. No renombrar (cero riesgo real, cero beneficio).**

### 4. Documentación desactualizada
- `IMPLEMENTATION_PHASE_10.md:5` dice *"Propuesta — sin código escrito todavía"*, pero ya está implementado desde hace varias fases (`render.js`, `experience.css`).
- `README.md` (raíz) y `app/README.md` no mencionan Aurora (`experience.html`, `debug.html`, `memories.html`) en absoluto — solo describen la guía estática y el prototipo viejo con backend.
- `README.md:23` (raíz) menciona `dia3-desayuno.jpg` como sin usar — ese archivo no existe (es `dia2-desayuno.jpg`).
**Acción: corregir los 3 documentos.**

### 5. Imágenes sin referenciar
Solo `images/dia2-desayuno.jpg`, ya documentado como intencional (el hotel incluye desayuno). Sin acción.

### 6. Robustez de persistencia (localStorage)
`progressStore.js` y `memoryStore.js` ya manejan `JSON.parse` fallido con `try/catch`, pero **`storage.setItem` no está protegido** en ninguno de los dos. Si el navegador bloquea `localStorage` (Safari en modo privado, cuota excedida), la escritura explota sin capturar, y el click que la disparó queda sin persistir y sin feedback — exactamente el tipo de fragilidad que "se ve como prototipo".
**Acción: envolver `storage.setItem` en `try/catch` en ambos stores (mismo criterio que ya usan para lectura: fallar en silencio, nunca romper la UI).**

### 7. Otros code smells
`console.log` con estilo CSS y `style="..."` inline en `main.js` — existen, pero están dentro del archivo protegido. Sin acción.

## Alcance de la Épica 2

1. Corregir `IMPLEMENTATION_PHASE_10.md` (estado real: implementado).
2. Actualizar `README.md` raíz y `app/README.md`: mencionar Aurora, aclarar que el backend Cloudinary/Mongo es una vía legada congelada y desacoplada del motor nuevo, corregir el nombre de imagen sin usar.
3. Endurecer `progressStore.js` y `memoryStore.js`: `try/catch` alrededor de `storage.setItem`, con tests que confirman que un storage que lanza error no rompe la app.

**Fuera de alcance (evaluado y descartado):** tocar `main.js`/backend legado, renombrar `.section-title`, unificar estilos de las herramientas de debug.

**Criterio de éxito:** documentación consistente con el código real, `npm test` en verde con los tests nuevos de resiliencia, cero cambios en `main.js` o en el backend legado.
