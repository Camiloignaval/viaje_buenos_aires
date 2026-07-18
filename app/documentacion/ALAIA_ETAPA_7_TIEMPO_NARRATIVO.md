# Alaia · El Tiempo Narrativo del Viaje

**Agente 2 — Arquitecto de la Experiencia Narrativa**
**Estado:** propuesta de diseño. No es implementación. No toca código, CSS, React ni arquitectura.
**Regla que gobierna todo:** *Alaia deja de seguir un calendario y empieza a acompañar el momento correcto.*

> Hallazgo central que ordena todo el documento: **Alaia no necesita arquitectura nueva.** Todo el tiempo del producto ya pasa por un solo valor (`now`) y una sola compuerta (`getChapterStatus`). El problema no es estructural: es que hoy esa compuerta mira **el día de calendario del navegador**. Cambiar *cómo se lee el tiempo* —no *cómo se guarda*— resuelve el 90% de la sensación. El resto es voz.

---

## 1. Filosofía del tiempo en Alaia

Un calendario responde *qué día es*. Un compañero de viaje responde *dónde estás en tu viaje*. No es lo mismo.

El viaje no empieza a las 00:00. A esa hora estamos durmiendo en Chile. El viaje tampoco empieza cuando un reloj cruza una línea: empieza cuando **la vida cambia de lugar**. Sales de casa, esperas en el aeropuerto, el avión despega, aterriza, entras por primera vez al hotel. Ninguno de esos momentos es "medianoche". Todos son humanos.

Cuatro principios de tiempo:

- **El tiempo se percibe, no se calcula.** Lo que importa no es el instante UTC: es la hora *que sientes* en el lugar donde estás llegando. Alaia debe leer el reloj de Buenos Aires, no el del dispositivo.
- **Un día empieza cuando despiertas a él, no a medianoche.** El capítulo siguiente no se abre a las 00:00 de un día vacío. Se abre en la mañana de ese día, cuando hay algo que vivir.
- **Vivir un momento puede adelantar el tiempo; nunca atrasarlo.** Si guardas la primera foto, ya llegaste — aunque el reloj diga otra cosa. La acción manda sobre el calendario, pero solo hacia adelante.
- **El tiempo nunca castiga.** Un vuelo perdido, un día de adelanto, un día sin conexión: nada de eso rompe el libro. Lo peor que puede pasar es que un capítulo espere con paciencia, o que se abra un poco antes. Ninguna de las dos cosa duele.

---

## 2. Principios de diseño

- **Una sola fuente de verdad temporal.** Todo se deriva de `now` leído en la zona horaria del destino. No hay relojes paralelos, ni banderas de estado que puedan desincronizarse.
- **Estado mínimo, lectura rica.** Lo que se *persiste* sigue siendo lo mismo de hoy (progreso pegajoso por capítulo). Lo que cambia según la hora del día es **puro render**: se calcula al mirar, no se guarda. Un atardecer no es un estado que hay que archivar; es una lectura de `now`.
- **La acción abre, nunca cierra.** Cualquier señal de "ya estoy viviendo esto" puede adelantar el desbloqueo. Ninguna señal puede bloquear algo ya abierto (coherente con la regla de *sin gating de recuerdos*).
- **Degradación siempre hacia la ternura.** Ante cualquier duda —sin datos, sin permiso, reloj raro— Alaia elige el estado más cálido y menos roto posible.
- **Cero vigilancia.** La mínima información necesaria. El destino ya está en el contenido; la hora ya está en el dispositivo. No se pide nada más.
- **Simulable sin salir de casa.** Cualquier momento del ciclo de vida se puede previsualizar con Director Mode, sin GPS, sin esperar fechas reales.

---

## 3. Estados narrativos

Alaia **no necesita estados nuevos**. Los cuatro modos que ya existen (`PRE_TRIP`, `IN_PROGRESS`, `EPILOGUE`, `MEMORY_MODE`) cubren todo el arco. Lo que faltaba no eran modos: era **voz dentro de cada modo**, según la hora percibida.

Los momentos humanos que pediste no son estados de máquina. Son **caras** de un modo, elegidas al vuelo leyendo `now`. Se mapean así:

| Momento humano | Modo existente | Qué cambia (solo voz / superficie) |
|---|---|---|
| **Semanas antes** | `PRE_TRIP` | Cuenta regresiva amplia. Preparativos (checklist ya existe): maletas, documentos, apps, dinero. |
| **Días antes** | `PRE_TRIP` | La cuenta se aprieta: "faltan 3 días". La preparación gana urgencia serena. |
| **Hoy nos vamos** (mañana del día de partida, *antes* del umbral de llegada) | `PRE_TRIP` (cara "partida") | El libro cambia de tono: *"Hoy empieza el viaje."* Pero **todavía no dice Bienvenidos.** La cuenta regresiva se vuelve "hoy / en unas horas". |
| **Aeropuerto · espera · embarque · vuelo** | `PRE_TRIP` (cara "en camino") | Voz breve de tránsito: *"Todavía en el aire. Buenos Aires te espera."* Sin itinerario, sin bienvenida prematura. |
| **Llegada** (se cruza el umbral) | `IN_PROGRESS`, Día 1 | Ahora sí: *"Bienvenidos a Buenos Aires."* Es el único salto que se siente como umbral. |
| **El día** | `IN_PROGRESS` | La secuencia de pasajes completa (composiciones Pleno/Caminado/Pausa/Umbral, ya diseñadas). |
| **Atardecer** | `IN_PROGRESS`, mismo día | La hora dorada habla por Companion si cambia una decisión. No es un estado; es una nota. |
| **Noche** | `IN_PROGRESS`, mismo día | Aparece con suavidad la invitación de cierre: escribir, subir fotos, cerrar el capítulo. Es la casilla Cierre, no una pantalla nueva. |
| **Día siguiente** | `IN_PROGRESS`, capítulo siguiente | Se abre en la **mañana** local del destino, no a medianoche. El día anterior queda leído (pegajoso), nunca desaparece. |
| **Último día** | `IN_PROGRESS` | Mismo motor, otro tono en el copy: se siente el final acercándose. |
| **Vuelo de regreso · llegamos a casa** | `EPILOGUE` | El capítulo especial. El libro empieza a mirar hacia atrás. |
| **Post-viaje (una semana, un mes)** | `MEMORY_MODE` | El libro se vuelve objeto terminado: folio, fecha, silencio. Se relee, no se opera. |

**La clave:** de PRE_TRIP a IN_PROGRESS hay un solo salto que importa —**el umbral de llegada**— y hoy ese salto ocurre en el momento equivocado (medianoche del navegador). Todo lo demás (atardecer, noche) ya es lectura de hora *dentro* del capítulo en curso.

---

## 4. Transiciones

Solo hay dos transiciones que ameritan diseño. El resto son consecuencia natural de ellas.

### 4.1 · El umbral de llegada (PRE_TRIP → IN_PROGRESS)

Es la transición que hoy se rompe. Debe dispararse por **la primera de estas señales que ocurra**:

1. **El reloj del destino cruza el umbral de apertura del Día 1** — no la medianoche, sino el momento curado de llegada (ej. la tarde en que aterrizamos). Leído en zona horaria de Buenos Aires, no del dispositivo.
2. **La primera acción real** — el viajero abre el capítulo de llegada o guarda su primer recuerdo. Si ya estás viviéndolo, ya llegaste.

Lo que ocurra primero, gana. La segunda señal es un **acelerador**, no una compuerta: puede adelantar la llegada, nunca retrasarla.

### 4.2 · El paso de día (día N → día N+1, dentro de IN_PROGRESS)

- Se abre en la **mañana** local del destino del día N+1 (umbral de amanecer), no a las 00:00.
- El día N **no se cierra ni se oculta**: queda como capítulo leído (estado pegajoso). Siempre se puede volver.
- El acelerador por acción también aplica: un viajero madrugador que abre el día siguiente lo abre; no se le dice "todavía no".
- "Dormir" no es una señal detectable sin vigilancia. La mañana local es el proxy humano y suficiente.

### Transiciones internas (no son transiciones de estado)

Atardecer y noche **no** son transiciones: son lecturas de `now` dentro del mismo capítulo que deciden si una nota (hora dorada) o una casilla (invitación de cierre) se muestran. No se persisten, no disparan eventos. Aparecen y desaparecen con la hora, como la luz real.

---

## 5. Qué señales utiliza Alaia

Lista completa evaluada; marcadas solo las que aportan valor real.

| Señal | ¿La usa? | Para qué | Costo / permiso |
|---|---|---|---|
| **`now` (fecha + hora local del dispositivo)** | ✅ Sí | Base de todo. | Cero. |
| **Zona horaria del destino** (`livingContext.timezone`, ya en el schema) | ✅ Sí | Leer `now` como hora percibida en el lugar de llegada. Resuelve el bug del 00:00. | Cero. Va en el package, funciona offline. |
| **`travelDates` + `chapter.date` / `order`** (ya existe) | ✅ Sí | Fechas de referencia de cada capítulo. | Cero. |
| **Umbral de apertura del capítulo** (hora curada de llegada / amanecer) | ✅ Sí | Que el día empiece cuando se vive, no a medianoche. | Cero. Dato editorial. |
| **Progreso pegajoso** (`chapterStatuses`, ya existe) | ✅ Sí | Nada retrocede; lo abierto queda abierto. | Cero. |
| **Primera acción real** (abrir capítulo / guardar primer recuerdo) | ✅ Sí | Acelerador humano: vivir adelanta el tiempo. Ya disponible vía `actions.start`. | Cero. |
| Fecha (día de calendario a secas) | ⚠️ Solo como piso | Sigue existiendo, pero ahora refinada por hora y zona. | — |
| GPS / coordenadas | ❌ No | — | Permiso, fricción, falla en avión/offline. Innecesario. |
| Geocercas | ❌ No | — | Igual que GPS. |
| País / ciudad por red | ❌ No | El destino ya está en el contenido. | Vigilancia innecesaria. |
| Movimiento / velocidad | ❌ No | — | Vigilancia. |
| Estado de conexión | ⚠️ Marginal | Solo para sincronizar en segundo plano (ya existe). Nunca para decidir el momento narrativo. | — |
| Cambio de país del dispositivo | ❌ No | Anclamos a la zona del destino, no a la del aparato. | — |

**Principio de selección:** una señal entra solo si (a) aporta a *sentir el momento correcto* y (b) no pide permisos ni vigila. La zona horaria del destino + la hora local + la primera acción bastan para todo el ciclo.

---

## 6. Qué señales ignora Alaia (y por qué)

- **GPS y geocercas.** El destino ya vive en el contenido; la hora ya vive en el dispositivo. El GPS solo agrega un permiso que se puede rechazar, que falla en el avión y sin conexión, y que se siente como vigilancia. No compra nada que la zona horaria no dé gratis.
- **Ubicación por red / país del dispositivo.** Anclar a "dónde está el teléfono" rompe en escalas, con VPN, o si alguien abre el libro desde otro país. Anclamos a **la zona horaria del destino**, que es estable y curada.
- **Movimiento y velocidad.** No necesitamos saber si el avión despegó. Necesitamos saber si es hora de llegar allá. Son cosas distintas.
- **La medianoche como frontera.** Es el origen del bug. Un día no empieza a las 00:00 en un huso ajeno; empieza cuando despiertas a él en el lugar.
- **El reloj manipulado como amenaza.** Si alguien adelanta el reloj del teléfono, verá contenido antes. No es un problema de seguridad: el libro es suyo. Es exactamente lo mismo que Director Mode. No merece defensa.

---

## 7. Cómo se resuelven los casos límite

Todos se resuelven **sin GPS y sin conexión**, porque la lógica es local.

| Caso | Qué hace Alaia |
|---|---|
| **Rechaza el GPS** | Nada cambia: nunca se le pidió. |
| **Sin internet** | Todo funciona. Zona horaria y contenido van en el package; `now` es local. La sincronización de recuerdos espera a haber señal (ya existe). |
| **Abre Alaia dentro del avión** | Sigue en la cara "en camino" de PRE_TRIP hasta cruzar el umbral de llegada. Sin bienvenida prematura. |
| **Abre durante una escala** | Igual que en el avión. La escala no confunde a nadie porque no leemos ubicación. |
| **Cambia la hora manualmente** | Ve contenido antes o después. Aceptable: es su libro, mismo comportamiento que Director Mode. |
| **Cambia de país** | Irrelevante. Anclamos a la zona del destino, no a la del dispositivo. |
| **Llega un día antes** | El **acelerador por acción** abre el día en cuanto empieza a vivirlo (abrir capítulo / primer recuerdo). No se le dice "todavía no". |
| **Llega un día después** | El capítulo esperó, pegajoso. Lo abre cuando llega. Nada se perdió ni caducó. |
| **Pierde un vuelo** | Idéntico al anterior: el día espera con paciencia. El tiempo nunca castiga. |
| **Hace el viaje entero sin conexión** | Funciona completo en local. Los recuerdos se sincronizan al volver la señal. |
| **Nunca concede permisos** | No hay ningún permiso que conceder para que el tiempo narrativo funcione. |

**Patrón común:** ante ambigüedad, Alaia elige *esperar con calidez* o *abrir por acción*. Nunca *bloquear con frustración*.

---

## 8. Cómo se integra con Director Mode

Director Mode ya existe y ya congela un `now` simulado (`?now=YYYY-MM-DD`, solo DEV, eliminado del build de producción). Solo necesita **una extensión mínima, ya prevista por el propio código**:

- **Aceptar hora, no solo día:** `?now=2026-07-18T15:00`. El motor ya construye `new Date(...)` con la cadena; hoy fuerza mediodía. Dejarlo leer la hora dada permite simular **el umbral de llegada, el atardecer y la noche** sin esperar fechas reales.
- **Con esto se previsualiza el ciclo completo** sin GPS y sin reloj real:
  - `?now=2026-07-18T09:00` → "hoy nos vamos / en camino"
  - `?now=2026-07-18T15:00` → llegada, "Bienvenidos"
  - `?now=2026-07-18T20:30` → atardecer / invitación de cierre
  - `?now=2026-07-19T08:00` → apertura del Día 2
  - una fecha posterior a `travelDates.end` → epílogo / modo recuerdo
- **El acelerador por acción también es simulable:** basta abrir el capítulo o guardar un recuerdo en la vista, tal como haría el viajero. No requiere nada nuevo.
- **QA sin depender de sensores:** este es el punto que pediste. Todo estado narrativo es una función pura de `now` (+ progreso), así que un parámetro de URL reproduce cualquier momento del viaje de forma determinística.

---

## 9. Cómo se integra con la arquitectura existente sin modificarla

Este diseño **vive encima** de lo que ya hay. No propone stores, eventos, servicios ni motores nuevos. Se apoya en tres piezas que ya existen:

1. **Un solo punto de entrada del tiempo.** `now` se resuelve una vez en `useExperience`. Leerlo en la zona horaria del destino es un cambio de *interpretación*, no de arquitectura: el resto del sistema sigue recibiendo un `now` y no se entera.
2. **Una sola compuerta de desbloqueo.** `getChapterStatus` ya compara `now` contra una fecha de referencia. El refinamiento —comparar contra un **umbral con hora, en la zona del destino**— es la misma comparación, más fina. Sigue devolviendo los mismos cuatro estados de capítulo.
3. **El acelerador ya está construido.** `actions.start(chapterId)` marca STARTED, que es pegajoso y ya se trata como visible. "Vivir adelanta el tiempo" no necesita mecanismo nuevo: es llamar a algo que ya existe.

Lo que se agrega es del mismo tipo que `dayLived.ts` / `resolveActivityComposition`: **funciones puras de lectura**, no estado. Un helper que, dado `now` y el trip, responde *"¿qué cara del modo mostrar?"* (partida / en camino / día / atardecer / noche). No persiste nada, no dispara nada, no guarda banderas. Se calcula al renderizar, igual que hoy se calcula la composición de un pasaje.

**Lo que NO se toca:** el modelo de datos, los cuatro `StoryMode`, el progreso pegajoso, el almacenamiento de recuerdos y fotos, la sincronización. Todo intacto.

---

## 10. Recomendación final

Alaia no tiene un problema de arquitectura. Tiene un problema de **percepción del tiempo**, y está concentrado en un solo lugar: la compuerta lee el día de calendario del navegador. Por eso a las 00:00, dormidos en Chile, el libro ya da la bienvenida a Buenos Aires.

La recomendación, en orden de impacto:

1. **Leer `now` en la zona horaria del destino** (dato que ya está en el schema). Es el cambio de mayor impacto y menor costo: por sí solo alinea el "hoy" del libro con el "hoy" del viaje.
2. **Convertir el desbloqueo del Día 1 en un umbral con hora** (el momento curado de llegada), no en la medianoche. Aquí muere el bug del "Bienvenidos" prematuro.
3. **Dejar que la primera acción real adelante el tiempo** —usando `actions.start`, que ya existe— para que quien llega antes o vive antes nunca escuche "todavía no".
4. **Abrir cada día siguiente en la mañana local**, no a medianoche, dejando el día previo siempre legible.
5. **Extender Director Mode a hora** (`?now=…THH:mm`) para simular el ciclo completo sin sensores.

Todo lo demás —partida, aeropuerto, vuelo, atardecer, noche, último día, regreso, post-viaje— **no requiere nada nuevo**: son caras de los cuatro modos, elegidas leyendo la hora, expresadas en voz y en qué casilla se muestra.

El resultado que buscabas: cuando el viajero abra Alaia a las 00:00 durmiendo en Chile, el libro no dirá "Bienvenidos". Dirá, con calma, *"Hoy empieza el viaje."* Y recién cuando de verdad esté pisando Buenos Aires —por reloj del destino o porque ya empezó a vivirlo— dirá *"Bienvenidos."*

Ahí Alaia deja de seguir un calendario y empieza a acompañar la vida real.

---

*Fin del documento. Diseño narrativo, no implementación. Toda la lógica descrita es función pura de `now` + progreso, sin stores, eventos ni sensores nuevos.*
