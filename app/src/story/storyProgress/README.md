# storyProgress

**Responsabilidad:** calcular el estado de cada capítulo de un Story Package (`locked` / `available` / `started` / `completed`) para un momento dado, según las reglas de `07_Business_Rules.md` y `08_State_machine.md`. Incluye el capítulo especial, cuya fecha de referencia es siempre la suya propia (`date`), nunca `travelDates.end`.

**Qué NO hace:**
- No persiste nada — es una función pura, sin efectos secundarios.
- No decide cuándo alguien "inicia" o "cierra" un capítulo — esas transiciones las dispara una acción externa (Presentation/Memory Engine); este módulo solo respeta ese dato una vez que existe (`chapterStatuses`).
- No valida la forma del Story Package — asume que ya pasó por `storyPackage.js`.
- No sabe nada de notificaciones, memorias ni sincronización.

**Dominios que conoce:** Story Package (solo lee capítulos y reglas de desbloqueo).

**Dominios que no debe conocer:** Memory Engine, Notification Engine, Media Storage, Synchronization, Presentation. No sabe cómo se guarda el progreso del viajero ni cómo se muestra en pantalla.

**Aislamiento:** no depende de React ni de ningún framework. Se prueba con Story Packages simulados mínimos (`storyProgress.test.js`), nunca contra el Story Package real de Buenos Aires — reutilizable para cualquier historia futura sin cambios.
