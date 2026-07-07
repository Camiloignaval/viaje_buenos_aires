# storyEngine

**Responsabilidad:** combinar Story Package + Story Progress + contexto (fecha, progreso persistido) en una única vista (`StoryView`) lista para que Presentation la consuma, sin que Presentation tenga que interpretar reglas de negocio por su cuenta.

**Qué NO hace:**
- No calcula estados de capítulo — eso ya lo hace `storyProgress.js`; este módulo solo lo organiza.
- No persiste ni lee el progreso desde ningún lado — lo recibe como dato de entrada (`context.chapterStatuses`).
- No decide cómo se muestra nada (ej. si `nextUnlock` se presenta como cuenta regresiva) — eso es una decisión de contenido/Presentation, no de este módulo.
- No valida la forma del Story Package — asume que ya pasó por `storyPackage.js`.

**Dominios que conoce:** Story Package y Story Progress (ambos por composición directa, sin duplicar su lógica).

**Dominios que no debe conocer:** Memory Engine, Notification Engine, Album Engine, Synchronization, Presentation. No sabe cómo se ve nada, ni cómo se guarda el progreso.

**Aislamiento:** no depende de React ni de ningún framework. Se prueba con Story Packages simulados (`storyEngine.test.js`), nunca contra el Story Package real de Buenos Aires — reutilizable para cualquier historia futura sin cambios.
