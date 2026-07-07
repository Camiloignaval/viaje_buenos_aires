# SPECIAL_CHAPTER_DESIGN.md

**Autor:** Lead Software Architect
**Alcance:** Diseño de experiencia del capítulo especial (cumpleaños) — antes de cualquier definición de datos.
**Estado:** Diseño conceptual. Sin código, sin JSON, sin cambios al repositorio.

---

## 1. Filosofía del capítulo

Los cuatro días anteriores fueron **coreografiados**: propuestas sugeridas, horarios orientativos, lugares curados. Aurora actuó como una guía cuidadosa que susurra "hoy podrían descubrir...".

Este capítulo no tiene coreografía. No hay nada que Aurora sepa mejor que el viajero sobre cómo debería sentirse este día. Por eso el capítulo especial no es "un capítulo más con menos reglas" — es el único momento de toda la historia donde **Aurora deja de guiar y empieza a atestiguar**.

Si los días 1 a 4 respondían "¿qué podríamos hacer hoy?", este capítulo responde una pregunta distinta: **"¿qué querés recordar de todo esto?"**. Es retrospectivo por naturaleza, no prospectivo — mira hacia atrás, sobre los cuatro días ya vividos, tanto como hacia el presente del propio día.

Esto conecta directamente con el manifiesto (`04_The_Aurora_Manifesto.md`): *"No creemos en la perfección. Creemos en la autenticidad."* Ningún otro capítulo debería sentirse menos producido que este.

## 2. Objetivo emocional

Que la persona que cumple años cierre el día sintiéndose **vista**, no *acompañada por una checklist completada*.

El criterio de éxito no es "¿completó las 6 secciones del capítulo?" — es el mismo "efecto Aurora" de `01_Product_Vision.md`: que sonría antes de terminar de leer, no después de tocar un botón.

Este capítulo es, además, el **pago emocional** de todo lo acumulado en los días 1 a 4: cada nota, cada favorito, cada foto guardada existió, en parte, para tener algo que ofrecerle de vuelta a la persona hoy. Por eso propongo que el capítulo no empiece preguntando nada — debería empezar **devolviendo** algo (ver §5).

## 3. Cómo se desbloquea

Se mantienen las dos condiciones ya definidas en `07_Business_Rules.md`/`08_State_machine.md` y heredadas en el contrato (`unlockRule` del `specialChapter`):

1. La fecha real alcanzó la fecha propia del capítulo especial.
2. El último capítulo regular quedó finalizado.

Ambas siguen siendo necesarias — no alcanza con que llegue la fecha si todavía queda un día del viaje sin cerrar, y no alcanza con haber cerrado el viaje si todavía no llegó el día.

## 4. Relación con `travelDates.end`

Esto es lo que dejé pendiente en `STORY_PACKAGE_BA2026.md` §12, y lo resuelvo acá con una decisión de diseño clara:

**La fecha del capítulo especial nunca debe calcularse como un offset de `travelDates.end`.** Deben ser dos fechas completamente independientes entre sí.

La razón no es anecdótica: en Buenos Aires 2026, el cumpleaños real (22 de julio) cae **después** de que el viaje físico ya terminó (el vuelo de regreso es el 21 de julio a la noche). El capítulo especial, entonces, no es el "día 5 del viaje" — es un capítulo que se vive **ya de vuelta**, como una continuación de la historia más allá del viaje físico. Esto no es una rareza de este caso: una historia futura podría tener su hito especial *durante* el viaje, *justo* al final, o *semanas después* (un aniversario de pareja que cae mucho después del regreso, por ejemplo).

Por eso el capítulo especial necesita su **propia fecha de referencia explícita**, independiente de `travelDates.end`, y su desbloqueo se calcula contra esa fecha propia — nunca contra "el día siguiente al último capítulo". Esta es una corrección de diseño respecto a cómo lo insinuaba el ejemplo anterior, y la resuelvo formalmente cuando volvamos al contrato de datos.

## 5. Navegación

Durante los cuatro días regulares, cada capítulo vive dentro de una experiencia con estructura (timeline, secciones, botón de cierre). El capítulo especial **no tiene esa estructura en absoluto** — no hay tabs, no hay navegación persistente, no hay forma de "saltar" a una sección. Es un único flujo continuo, de principio a fin, como abrir un sobre: se entra por un solo lugar y se avanza en un solo sentido.

Esto es intencional y coherente con `12_Experience_Blueprint.md`: la navegación de 4 ítems (Historia, Álbum, Mapa, Nosotros) **todavía no existe en este punto** — nace recién cuando el capítulo especial se completa (ver §10). Mientras se está viviendo el capítulo especial, no hay "afuera" al que volver: es, deliberadamente, el momento de menor superficie de interfaz de toda la historia.

## 6. Qué elementos desaparecen respecto a un capítulo normal

- Horarios y timeline.
- Mapa.
- Itinerario y actividades sugeridas ("propuestas").
- Checklist y presupuesto.
- Recomendaciones nuevas de lugares (restaurantes/cafeterías sugeridas para *hoy*).
- Cualquier indicador de progreso.
- Notificaciones de tipo logístico ("es hora de salir hacia...").
- El tono de "propuesta" completo — este día no invita a *hacer* cosas nuevas, invita a *recordar*.

## 7. Qué elementos nuevos aparecen

- **Aurora se dirige directamente a la persona que cumple años**, no en plural — es el único capítulo donde el protagonista deja de ser "ambos" y pasa a ser una sola persona (`02_User_Experience.md`).
- **Un "espejo" inicial**: antes de pedir nada, el capítulo devuelve 1 o 2 Memorias reales ya capturadas en los días 1 a 4 (una foto, una nota) a modo de "¿te acordás de esto?". Es la primera vez que la historia se mira a sí misma — un anticipo de lo que hará Album Engine más adelante, pero mostrado acá como un gesto, no como una función.
- **Los seis prompts ya definidos** (reflexión, carta, restaurante favorito, cafetería favorita, mejor momento, mejor fotografía) — nunca hay un séptimo prompt de calificación.
- **Un cierre distinto a "cerrar un día"**: no es un botón más — es el cierre de todo el viaje (ver §9).
- **Un gesto de regalo** (`09_Storytelling.md` lo llama "Acto IV: El regalo"): algo que Aurora entrega en el momento justo — puede ser tan simple como revelar la carta si fue escrita de antemano por el otro miembro de la pareja. Importante: esto nunca debe sentirse como una recompensa desbloqueada por cumplir una acción (`10_Content_Rules.md`, Regla 17 — nada de gamificación). Es un regalo, no un logro.

## 8. Qué recuerdos invita a crear

A diferencia de los días 1 a 4 (donde `suggestedMemories` sugiere capturar algo *nuevo* de *hoy*), este capítulo trabaja mayormente **hacia atrás**, sobre lo ya vivido:

- **Mejor momento** y **mejor fotografía** — no son necesariamente nuevos: es elegir, entre lo ya capturado en los cuatro días, qué fue lo más importante. Esto es, en esencia, **marcar como favorita** una Memoria ya existente, no crear una desde cero.
- **Restaurante favorito** y **cafetería favorita** — misma lógica: se elige entre los lugares ya visitados (`placesCatalog`), no se sugiere uno nuevo.
- **Reflexión** y **carta** — estas sí son genuinamente nuevas: contenido que no existía antes de este capítulo, escrito en el momento.

Esta distinción importa para el diseño de datos que viene después: la mitad de este capítulo es **curaduría de lo ya vivido**, y la otra mitad es **creación nueva**. No debería modelarse como si las seis cosas fueran del mismo tipo.

## 9. Qué información debe guardar

- Las dos piezas de contenido nuevo (reflexión, carta) como Memorias tipo nota.
- Las cuatro elecciones retrospectivas (mejor momento, mejor fotografía, restaurante favorito, cafetería favorita) como referencias a Memorias/lugares ya existentes, marcados como destacados — no como copias nuevas del contenido.
- La marca de finalización del capítulo especial (el instante que dispara la transición de estado que ya existe en `DOMAIN_MODEL.md`: `CapituloEspecialDesbloqueado` → cierre → `HistoriaEntroEnModoMemoria`).

No debería guardarse ninguna calificación, ninguna estadística de progreso, ni ningún dato que no haya sido pedido explícitamente por uno de los seis prompts.

## 10. Cómo termina la historia (el cierre de este capítulo)

Cerrar un día regular es un gesto pequeño y diario ("descansemos, nos vemos mañana"). Cerrar el capítulo especial es un gesto único e irreversible — es el cierre del viaje completo, no de un día.

Propongo que este cierre sea el único momento en que la evolución del ícono de la app (`12_Experience_Blueprint.md`: ✈️ → 🗺️ → 🎁 → 📖 → ❤️) deje de ser una metáfora de fondo y se vuelva **visible como parte del ritual de cierre** — el usuario ve, en ese instante, que algo cambia de verdad. Nunca con un mensaje tipo "Modo álbum activado" (eso está explícitamente prohibido) — el cambio se *revela*, no se *anuncia*.

Y, como en cualquier cierre de Aurora, nunca "Fin." — algo en la línea de "Nos volveremos a encontrar" (`02_User_Experience.md`), pero con más peso, porque esta vez es cierto: no hay un capítulo 6 al que volver mañana.

## 11. Cómo conecta con Memory Mode

El cierre de este capítulo **es** el evento que dispara `HistoriaEntroEnModoMemoria` (ya definido en `DOMAIN_MODEL.md`, dominio Story Progress). A partir de acá:

- La navegación de 4 ítems (Historia, Álbum, Mapa, Nosotros) aparece por primera vez — sin popup, sin anuncio, tal como exige `12_Experience_Blueprint.md` Etapa 6.
- Album Engine ensambla todo lo vivido, y las cuatro elecciones retrospectivas de este capítulo (§8) no son un dato más entre muchos — son las que **Album Engine debería destacar primero** al presentar el álbum. Este capítulo, en ese sentido, funciona como el índice curado de lo más importante del viaje, entregado por el propio protagonista.

## 12. Cómo conecta con los aniversarios futuros

El contenido nuevo de este capítulo (reflexión, carta) no es un recuerdo más — es, según `08_State_machine.md` y `09_Storytelling.md`, exactamente lo que se vuelve a mostrar cada año en `ANNIVERSARY_MODE`: la "máquina del tiempo" que recorre 17→22 de julio incluye explícitamente la carta de este capítulo como una de sus paradas.

Esto impone una restricción de diseño hacia atrás: el contenido que se capture acá tiene que **envejecer bien** — tiene que seguir teniendo sentido leído dentro de un año, y dentro de diez. No es contenido de un solo uso: es la semilla de un ritual que se repite (`10_Content_Rules.md`, Regla 16: *"los aniversarios son sagrados, nunca para vender"*).

---

*Sin código, sin JSON, sin cambios al repositorio. Cuando apruebes este diseño, lo traducimos al contrato de datos (probablemente ajustando `specialChapter` para que tenga su propia fecha de referencia, y distinguiendo curaduría retrospectiva de creación nueva dentro de sus prompts).*
