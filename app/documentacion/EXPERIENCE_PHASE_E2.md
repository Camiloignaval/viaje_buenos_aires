# EXPERIENCE_PHASE_E2.md

**Autor:** Lead Product Designer / Lead Software Architect
**Fase:** E-2 — El Ritual de Apertura de Capítulo
**Alcance:** El momento exacto en que un nuevo día comienza. No las actividades — el instante justo antes de ellas.
**Estado:** Visión de experiencia. Sin código, sin componentes, sin implementación.

---

## Objetivo emocional

Que la persona sienta que un día nuevo del libro se abrió para ella, en el momento justo — no que "entró a una sección de la app llamada Día 2".

## Qué debe sentir la persona

Bienvenida cálida, como si alguien le abriera una puerta que ya sabía que iba a abrirse. Un poco de expectativa — *¿qué habrá hoy?* — pero sin ninguna presión de tener que empezar nada todavía. La sensación de estar parada al principio de algo, nunca en medio de una lista de pendientes.

## Qué debe recordar dentro de diez años

No el texto exacto de la frase de apertura. Va a recordar la sensación de **abrir el teléfono a la mañana y que pareciera que alguien había escrito eso pensando justo en ese día** — el gesto de sentirse recibida, no el copy literal.

## Qué NO debe sentir

- Que "llegó tarde" a abrir el capítulo.
- Que hay una lista de tareas esperándola.
- Que el capítulo "estuvo ahí esperando" y ella se demoró.
- Apuro por llegar rápido a las actividades.
- Que está "iniciando sesión" o entrando a un panel.

## Cómo se aplica acá la Regla del tiempo

Este es, de todas las fases, donde la Regla del tiempo más se pone a prueba — porque un capítulo es lo único que técnicamente **sí** tiene una fecha real detrás. Por eso lo digo explícito: no importa si la persona abre el capítulo a las 7 de la mañana o a las 11 de la noche de ese mismo día — el tono, la frase de apertura y el ritmo son **exactamente los mismos**. Nunca hay una variante de copy que insinúe "se te está haciendo tarde" ni una versión "nocturna" que suene a disculpa. Y si el capítulo anterior se cerró tarde, o recién se cerró hoy mismo, el capítulo nuevo jamás lo menciona — cada capítulo llega fresco, sin cargar con la demora del anterior.

---

## Qué descubre primero

En este orden:

1. Un color o imagen de fondo evocador del día (el "Hero") — antes que cualquier palabra.
2. El título del capítulo, solo, con espacio alrededor.
3. La frase de apertura propia de ese capítulo (`chapter.copy.open`).

El número de día o la fecha (`"Día 2 · Domingo 19 de julio"`) puede existir, pero como un dato menor y discreto — nunca como el titular de la pantalla. Lo primero que se lee tiene que ser algo humano, no una etiqueta de calendario.

## Qué permanece oculto

- Todas las actividades del día — ninguna se asoma todavía, ni como lista ni como preview.
- Los recuerdos sugeridos de ese capítulo.
- Cualquier referencia a otros capítulos — ni los "Todavía no" ni los "Vivido". Este momento es exclusivamente sobre **hoy**; los demás capítulos pueden reaparecer más abajo, después, nunca compitiendo por la atención en el instante de apertura.
- Cualquier indicio del capítulo especial.
- El estado de progreso general del viaje (ningún "día 2 de 4").

## Cómo sabe que comenzó un nuevo capítulo

No por un mensaje de sistema ("Capítulo desbloqueado", "Nuevo día disponible"). Lo sabe porque **la aplicación cambia de cara**: un color o imagen distinta, un título distinto, una voz distinta hablándole. Aurora no le pregunta qué día quiere ver — ya sabe qué día es, y se lo muestra sin que ella tenga que elegir nada. El cambio de estado se siente, no se anuncia.

## Qué ritmo tiene ese momento

Parecido al de E-1, pero con un poco más de vida — ya existe un vínculo previo, esto ya no es el primer contacto. Sigue sin haber apuro.

**Fundido del fondo/color → pausa breve → título → pausa → frase de apertura → (recién ahí) una invitación suave a seguir bajando**, generalmente el gesto natural de scroll, nunca un botón de "Siguiente" o "Ver actividades".

## Qué animaciones existen

- Fundido de entrada del color/imagen de fondo del capítulo — el primer gesto, antes que cualquier texto.
- El título aparece con un fundido suave, mismo lenguaje visual que ya establecimos en E-1 (consistencia entre fases).
- La frase de apertura aparece con una pequeña demora respecto al título — la misma pausa deliberada de siempre.
- Nada de animación de "desbloqueo" (ni un candado abriéndose, ni un check, ni un destello de "logro") — eso es mecánico, no narrativo, y no pertenece acá.

## Qué sonidos (si alguno) podrían aportar valor

Ninguno por defecto. Si en algún momento se agrega sonido a este instante, tiene que ser **estrictamente opcional y apagado por defecto** — nunca autoplay, coherente con la regla ya establecida de "nunca sonido que la persona no buscó explícitamente". Si existiera, lo único que tendría sentido es algo tan sutil como el sonido de una página al darse vuelta, disparado únicamente por el gesto de scroll de la persona — nunca música ambiental que arranca sola. El silencio es una opción igual de válida, y probablemente la más segura para esta fase.

## Qué debe pasar antes de mostrar la primera actividad

El recorrido completo — Hero → título → frase de apertura → invitación suave a seguir — tiene que completarse antes de que exista alguna forma de ver la primera actividad. No puede haber un atajo ("Ver todas las actividades") que se salte este momento. Nada de esto depende de una confirmación de la persona (no hay un botón "Estoy listo"): avanza con el scroll natural, con su propio tiempo, nunca con un checklist de entrada.

---

## ¿Por qué este momento existe?

Porque un día en Aurora no es un contenedor de tareas organizadas por fecha — es un capítulo de un libro. Y ningún libro que vale la pena arranca un capítulo nuevo tirándote el contenido encima: primero hay una página con el título, un respiro, y recién después la historia sigue. Sin este ritual, Aurora sería indistinguible de cualquier itinerario con fecha — una lista prolija, pero una lista al fin. Este momento es exactamente lo que convierte "la agenda de hoy" en "hoy empieza otra página de esta historia".

---

*Sin código, sin componentes. A la espera de tu aprobación antes de pasar a la Fase E-3.*
