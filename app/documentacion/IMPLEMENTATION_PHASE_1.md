# IMPLEMENTATION_PHASE_1.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Primera fase de implementación del motor de Aurora.
**Estado:** Propuesta — sin código escrito todavía. A la espera de aprobación.

---

## Objetivo de la fase

Construir el **núcleo del motor** — Story Package + Story Progress — como módulos puros, aislados del resto del proyecto, que no dependan de nada específico de Buenos Aires y que no toquen ni una línea de lo que ya funciona hoy.

Esta fase no busca que la aplicación "haga" nada nuevo visible. Busca que exista, por primera vez, un lugar en el código donde las reglas de negocio (desbloqueo de capítulos, secuencialidad, capítulo especial) vivan como lógica real y verificable — no como texto en la documentación ni como suposiciones dispersas en `main.js`.

### Propuesta de ajuste de alcance (para tu aprobación)

`TECHNICAL_ARCHITECTURE.md` §8 agrupaba "construir Story Progress" e "introducir el Story Engine" en pasos consecutivos del mismo plan. Propongo **separarlos en dos fases distintas**: esta fase construye únicamente Story Package + Story Progress; el Story Engine (la capa que combina ambos para responder "qué corresponde mostrar ahora") queda para la Fase 2, recién cuando empecemos a acercarnos a Presentation. Es más trabajo en pasos, pero cada paso es más chequeable de forma aislada — coherente con tu regla de preferir 30 pasos seguros a 3 gigantes.

## Alcance

**Incluido en esta fase:**
- El Story Package de Buenos Aires 2026 como archivo de datos real (`.json`), fiel a `STORY_PACKAGE_SCHEMA_v1.4.md` y a `STORY_PACKAGE_BA2026.md`.
- Un validador/cargador mínimo de Story Package: verifica que los campos obligatorios del contrato existan, con errores claros si falta algo.
- El dominio Story Progress: una función pura que, dado un Story Package, una fecha y qué capítulos están finalizados, determina el estado de cada capítulo (Bloqueado / Disponible / Iniciado / Finalizado) — incluyendo el epílogo, con su `date` propia e independiente de `travelDates.end`.
- Pruebas automatizadas de ambos módulos, cubriendo los escenarios ya documentados en `07_Business_Rules.md`.

**Explícitamente fuera de esta fase:**
- Story Engine (orquestación) — Fase 2.
- Cualquier UI o componente visual — no se toca `main.js`, `style.css` ni `index.html`.
- Memory Engine, Album Engine, Synchronization, Media Storage — fases posteriores.
- Notification Engine, Location Awareness, Story Authoring/Aurora Studio — futuro, ya definido como tal en `TECHNICAL_ARCHITECTURE.md`.
- Cualquier resolución de los gaps de schema pendientes (hotel sin lugar propio, categoría de bar, contenido de "Plan B") — no bloquean esta fase porque no son necesarios para calcular el estado de un capítulo.

## Qué archivos crearás

Todos nuevos, ninguno reemplaza algo existente:

| Archivo | Responsabilidad única |
|---|---|
| `app/src/story/storyPackage.js` | Cargar y validar la forma mínima de un Story Package. No sabe nada de Buenos Aires. |
| `app/src/story/storyProgress.js` | Calcular el estado de cada capítulo (incluido el epílogo) dado un Story Package + contexto de fechas/progreso. Función pura, sin efectos secundarios. |
| `app/src/story/storyPackage.test.js` | Pruebas del validador: casos válidos e inválidos. |
| `app/src/story/storyProgress.test.js` | Pruebas de la máquina de estados: los cuatro escenarios de `07_Business_Rules.md` + el caso del epílogo. |
| `app/src/story/data/story-ba2026.json` | El Story Package real de Buenos Aires 2026, tal como quedó definido en `STORY_PACKAGE_BA2026.md`. |

## Qué archivos modificarás

| Archivo | Cambio | Por qué |
|---|---|---|
| `app/package.json` | Agregar un script `"test": "node --test app/src/story"` | Para poder correr las pruebas de forma reproducible, sin agregar ninguna dependencia nueva (`node:test` es parte de Node, no una librería externa). |

Ningún otro archivo existente se toca. `main.js`, `data.js`, `storage.js`, `auth.js`, `image.js`, `style.css` e `index.html` quedan exactamente como están — la app actual sigue funcionando igual que hoy, sin ninguna conexión todavía al motor nuevo.

## Qué componentes crearás

(Uso "componente" en el sentido de módulo de software — este proyecto no usa un framework de componentes de UI.)

- **Story Package Loader/Validator**: recibe un objeto crudo, confirma que tiene la forma mínima del contrato (`storyId`, `metadata`, `storyMood`, `unlockRulesDefault`, `chapters`, `baseCopy`, y si existe `specialChapter`, que tenga `date` y `kind`), y devuelve el objeto validado o lanza un error legible señalando qué falta.
- **Story Progress (máquina de estados de capítulos)**: dado el Story Package + `{ now, completedChapterIds }`, devuelve el estado de cada capítulo. Implementa exactamente las dos condiciones ya definidas (`requiresDateReached`, `requiresPreviousChapterCompleted`), respetando que el epílogo se evalúa contra su propio `date`, nunca contra `travelDates.end`.

## Qué componentes reutilizarás

- **La estructura de carpetas existente** (`app/src`) como base — el motor nuevo vive adentro, no en un proyecto paralelo, tal como confirmamos en `TECHNICAL_ARCHITECTURE.md`.
- **`node:test` y `node:assert`**, ya incluidos en Node.js — se prefieren antes que instalar Vitest/Jest, porque hoy no existe ningún test en el proyecto y no hay razón todavía para traer una dependencia nueva solo para probar funciones puras.
- **El contenido ya extraído** en `STORY_PACKAGE_BA2026.md` — se traduce a JSON literal, no se re-redacta.

No se reutiliza nada de `data.js`/`storage.js`: pertenecen al modelo anterior (contenido hardcodeado) que esta fase existe justamente para reemplazar, no para heredar.

## Qué riesgos existen

- **Validación básica, no exhaustiva.** El validador de esta fase confirma presencia de campos obligatorios, no tipos profundos ni formatos (ej. que una fecha sea realmente una fecha válida). Es suficiente para un único Story Package interno; **no sería suficiente** el día que un Story Curator externo cargue uno — en ese momento hará falta una librería de validación real (ej. JSON Schema). No se resuelve ahora a propósito.
- **Asunción de zona horaria sin resolver.** `requiresDateReached` compara contra un `now` — de qué reloj (dispositivo del viajero, servidor, UTC) es una decisión que esta fase deja explícita pero no define con precisión, porque todavía no hay una capa de Infrastructure real conectada. Queda documentado como pendiente, no como bug.
- **Código sin consumidor todavía.** Nada importa estos módulos en esta fase — es deliberado (base antes que conexión), pero significa que hasta la Fase 2 esto no es visible ni demostrable dentro de la app real, solo mediante las pruebas.
- **Duplicación de conocimiento de negocio.** Las reglas de desbloqueo ya están escritas en `07_Business_Rules.md`/`08_State_machine.md` y ahora también en código — si algún día cambian, hay que actualizar ambos lados. Mitigado citando el documento de origen en comentarios del código.

## Cómo validaremos que la fase quedó terminada

- `npm test` (el nuevo script) corre en verde, sin ninguna prueba en rojo ni saltada.
- Las pruebas de `storyProgress.test.js` cubren, como mínimo:
  - Un capítulo permanece bloqueado si la fecha todavía no llega.
  - Un capítulo pasa a disponible cuando la fecha llega **y** el anterior está finalizado.
  - Un capítulo permanece bloqueado si la fecha ya llegó pero el anterior **no** está finalizado (el caso explícito de `07_Business_Rules.md`).
  - El epílogo se desbloquea contra su propia `date`, y seguiría bloqueado aunque `travelDates.end` ya haya pasado, si su propia fecha todavía no llegó.
- `story-ba2026.json` carga sin errores a través del validador.
- Ningún archivo fuera de la lista de "Qué archivos modificarás" cambió — se verifica con `git status` antes de dar la fase por cerrada.
- Cero menciones a "Buenos Aires", nombres propios o fechas de julio dentro de `storyPackage.js`/`storyProgress.js` — toda esa información vive únicamente en `story-ba2026.json`.

## Qué queda pendiente para la siguiente fase

- Construir el Story Engine (Fase 2): la capa delgada que combina Story Package + Story Progress para responder "qué corresponde mostrar ahora".
- Recién ahí, una primera conexión mínima y aislada hacia Presentation (probablemente una vista de depuración simple, no un reemplazo de `main.js` todavía).
- Memory Engine unificado (foto + video + nota) — no antes de que el motor de progreso esté probado y aprobado.
- Cualquier decisión sobre los gaps de schema pendientes, si para entonces se vuelven bloqueantes.

---

*Sin código escrito. A la espera de tu aprobación antes de crear el primer archivo.*
