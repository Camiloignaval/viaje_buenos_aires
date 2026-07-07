# storyPackage

**Responsabilidad:** cargar y validar que un objeto tenga la forma mínima de un Story Package, según `STORY_PACKAGE_SCHEMA_v1.4.md`. Si falta algo obligatorio, lanza `StoryPackageValidationError` con un mensaje legible.

**Qué NO hace:**
- No interpreta el contenido (no decide qué mostrar, eso es Story Engine).
- No calcula estados de capítulo (eso es Story Progress).
- No valida tipos profundos ni formatos de fecha — solo presencia de campos obligatorios.
- No sabe qué es "Buenos Aires" ni ninguna otra historia concreta.
- No toca UI, red, ni almacenamiento.

**Dominios que conoce:** únicamente la forma de Story Package.

**Dominios que no debe conocer:** Story Progress, Memory Engine, Story Mood (catálogo), Notification Engine, Presentation, Infrastructure (Mongo/Cloudinary/localStorage). No sabe que existe una UI ni una base de datos.

**Aislamiento:** no depende de React ni de ningún framework. Se prueba con objetos simulados (`storyPackage.test.js`), nunca contra el Story Package real de una historia — reutilizable para cualquier historia futura sin cambios.
