# IMPLEMENTATION_PHASE_2.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Segunda fase de implementación — el Story Engine.
**Estado:** Propuesta — sin código escrito todavía. A la espera de aprobación.

---

## Objetivo de la fase

Construir el **Story Engine**: la capa delgada que combina Story Package + Story Progress + fecha actual + progreso persistido, y entrega una única respuesta clara y lista para que Presentation la consuma — sin que Presentation tenga que volver a interpretar reglas de negocio por su cuenta.

"Delgada" es la palabra clave: el Story Engine no recalcula nada que Story Progress ya calcula — solo lo interpreta y lo organiza en una forma útil para pantalla.

## Alcance

**Incluido en esta fase:**
- Un único módulo, `storyEngine`, con una función que recibe un Story Package + contexto (fecha, progreso persistido) y devuelve la vista completa descrita en §"Forma de la salida".
- Pruebas con `node:test`, con Story Packages simulados (nunca el de Buenos Aires).
- El README correspondiente al nuevo módulo.

**Explícitamente fuera de esta fase (confirmado por tu regla nueva):**
- Cualquier vista de depuración o conexión con Presentation — eso es Fase 3, y cuando llegue será una vista aislada, nunca una integración en `main.js`.
- Memory Engine, Album Engine, Notification Engine, Synchronization — sin cambios.
- Persistencia real del progreso — el Story Engine recibe el progreso ya resuelto como dato de entrada, no lo lee de ningún lado.
- Cualquier decisión de diseño visual o de UI.

## Forma de la salida (`StoryView`)

| Campo | Tipo | Qué representa |
|---|---|---|
| `currentMode` | `"pre_trip"` \| `"in_progress"` \| `"epilogue"` \| `"memory_mode"` | La etapa macro de la historia. `"epilogue"` solo existe si el Story Package tiene `specialChapter`; si no lo tiene, se pasa directo de `"in_progress"` a `"memory_mode"`. |
| `visibleChapter` | Chapter \| `null` | El capítulo que Presentation debería mostrar ahora. `null` en `pre_trip` (todavía no hay nada que mostrar) y en `memory_mode` (ya no hay "un" capítulo actual — eso lo resolverá Album Engine más adelante). |
| `lockedChapters` | `string[]` (ids) | Capítulos **regulares** bloqueados. No incluye al capítulo especial — su estado se consulta aparte en `specialChapterStatus`. |
| `availableChapters` | `string[]` (ids) | Capítulos regulares en estado `available` **o** `started` (ver nota de diseño abajo). |
| `completedChapters` | `string[]` (ids) | Capítulos regulares finalizados. |
| `nextUnlock` | `{ chapterId, date }` \| `null` | El próximo capítulo bloqueado, con su fecha de referencia. `null` si no queda ninguno por desbloquear. |
| `specialChapterStatus` | `string` \| `null` | El estado (`locked/available/started/completed`) del capítulo especial, si existe. `null` si el Story Package no tiene uno. |
| `memoryModeAvailable` | `boolean` | Atajo booleano — equivale a `currentMode === "memory_mode"`. |

### Decisiones de diseño que quiero confirmar antes de programar

1. **`visibleChapter` devuelve el objeto completo del capítulo**, no solo su `id` — porque es, casi siempre, lo próximo que Presentation va a renderizar, y evitarle una búsqueda extra en `storyPackage.chapters` parece razonable. Los otros campos (`lockedChapters`, `availableChapters`, `completedChapters`) sí devuelven solo ids, para que el motor no duplique datos que Presentation ya tiene en el Story Package. Si preferís consistencia total (todo por id), lo cambio antes de escribir código.
2. **`available` y `started` se agrupan en `availableChapters`** — ambos significan, desde la perspectiva de Presentation, "este capítulo es alcanzable ahora". La distinción fina entre "recién desbloqueado" y "ya lo empezaron" sigue disponible a través de `visibleChapter` (que sí trae el estado real).
3. **`nextUnlock` expone una fecha, pero no decide si se muestra como cuenta regresiva.** Eso es una decisión de contenido (`10_Content_Rules.md` prohíbe cuentas regresivas de capítulos futuros, salvo la cuenta regresiva al inicio del viaje en `PRE_TRIP`). El Story Engine solo informa el dato — la regla de cuándo mostrarlo la aplica Presentation, no esta capa.

## Qué archivos crearás

| Archivo | Responsabilidad única |
|---|---|
| `app/src/story/storyEngine/storyEngine.js` | Combinar Story Package + Story Progress + contexto en un `StoryView`. |
| `app/src/story/storyEngine/storyEngine.test.js` | Pruebas de los cuatro `currentMode`, de `nextUnlock`, y del caso sin `specialChapter`. |
| `app/src/story/storyEngine/README.md` | Responsabilidad / qué no hace / dominios que conoce / dominios que no debe conocer. |

## Qué archivos modificarás

Ninguno. El script `test` de `package.json` ya cubre `src/story/**/*.test.js` de forma recursiva — no hace falta tocarlo.

## Qué componentes crearás

- **Story Engine**: una función (`getStoryView(storyPackage, context)`) que internamente llama a `getStoryProgress` (Fase 1) y traduce su resultado a la forma de arriba. No implementa ninguna regla de desbloqueo propia — todas ya viven en `storyProgress.js`.

## Qué componentes reutilizarás

- `storyPackage.js` y `storyProgress.js` completos, sin modificarlos.
- `getChapterReferenceDate` (ya existe en `storyProgress.js`) para calcular la fecha de `nextUnlock`, en vez de reimplementar el cálculo de fechas.
- El mismo patrón de módulo con README de la Fase 1.

## Qué riesgos existen

- **Heurística de `pre_trip`** (se asume `pre_trip` cuando el primer capítulo está `locked`): es correcta para el modelo secuencial actual, pero si una historia futura tuviera un primer capítulo bloqueado por otra razón que no sea "el viaje no empezó", esta heurística se equivocaría. Documentado, no resuelto — no hay caso real todavía que lo necesite.
- **Agrupar `available` + `started` en un solo balde** pierde granularidad que Presentation podría querer más adelante (ej. distinguir "recién desbloqueado" de "en curso" en una lista). Mitigado porque `visibleChapter` siempre expone el estado real; si hace falta más adelante, se agrega sin romper esta forma.
- **`memoryModeAvailable` es una fotografía, no un evento.** Cuando exista Notification Engine, necesitará detectar el *instante* en que pasa de `false` a `true`, no solo leer el valor actual — este módulo no resuelve eso, porque no le corresponde a esta fase.
- **El progreso sigue sin persistirse en ningún lado real.** El Story Engine acepta `chapterStatuses` como dato de entrada; nadie todavía se los provee desde un lugar durable. Sigue siendo, a propósito, responsabilidad de una fase futura (Synchronization).

## Cómo validaremos que la fase quedó terminada

- `npm test` sigue en verde, incluyendo las pruebas nuevas de `storyEngine.test.js`.
- Casos mínimos cubiertos:
  - `currentMode` es `"pre_trip"` antes de que el primer capítulo se desbloquee.
  - `currentMode` es `"in_progress"` con al menos un capítulo regular disponible o iniciado.
  - `currentMode` es `"epilogue"` cuando todos los capítulos regulares están completados y el especial todavía no.
  - `currentMode` es `"memory_mode"` cuando el especial está completado (y también para una historia simulada **sin** capítulo especial, una vez completados todos los regulares).
  - `nextUnlock` apunta al próximo capítulo bloqueado con la fecha correcta, y es `null` cuando ya no queda ninguno.
  - `visibleChapter` es `null` en `pre_trip` y en `memory_mode`.
- `git status` no muestra ningún archivo modificado fuera de los nuevos bajo `app/src/story/storyEngine/`.
- Cero menciones a Buenos Aires, nombres propios o fechas de julio dentro de `storyEngine.js`.

## Qué queda pendiente para la siguiente fase

- **Fase 3**: la primera conexión con Presentation — una vista de depuración aislada (nueva, separada de `main.js`) que simplemente imprima el `StoryView` actual para Buenos Aires 2026. Sin diseño final, sin estilos, sin reemplazar nada existente.
- Memory Engine unificado — todavía no hace falta para que la vista de depuración funcione.
- Persistencia real de `chapterStatuses` — hasta entonces, la vista de depuración probablemente simule el progreso a mano.

---

*Sin código escrito. A la espera de tu aprobación — en particular de las tres decisiones de diseño de la salida — antes de crear el primer archivo.*
