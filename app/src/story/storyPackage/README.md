# storyPackage

Contrato runtime autoritativo para cargar y validar cualquier Story Package.
Backend, React, Health Check y Alaia Studio delegan en `storyPackage.js`; la capa
TypeScript es sólo una proyección tipada del mismo validador.

Valida estructura raíz, metadata y fechas, capítulos e identidades únicas,
actividades, capítulo especial y referencias de media. No interpreta contenido,
no calcula progreso, no conoce destinos y no toca UI, red ni persistencia.

Los tests genéricos viven junto al engine. Las pruebas editoriales de una historia
concreta viven dentro de su propio paquete bajo `src/content/stories/`.
