# EXPERIENCE_PHASE_E1.md

**Autor:** Lead Product Designer / Lead Software Architect
**Fase:** E-1 — El Primer Contacto
**Alcance:** El primer minuto de uso de Aurora. No la portada como pantalla — la bienvenida como emoción.
**Estado:** Visión de experiencia. Sin código, sin componentes, sin implementación.

---

## Objetivo emocional

Que la persona sienta, antes de leer una sola palabra, que **esto no le va a exigir nada** — y que precisamente por eso, quiere quedarse.

## Qué debe sentir la persona

Quietud. Una sorpresa calma, no una sorpresa que sobresalta. La sensación de haber recibido algo hecho a mano, no de haber abierto un producto. Un poquito de anticipación, sin ansiedad — ilusión, no urgencia.

## Qué debe recordar dentro de diez años

No el texto exacto. No el diseño exacto. Va a recordar **la sensación de la pausa** — ese segundo y medio en el que la pantalla no le pidió nada, y en el que entendió, sin que nadie se lo dijera, que esto era distinto. Si algo de este primer minuto perdura, tiene que ser eso: *"me acuerdo que cuando la abrí, no pasó nada al principio — y me gustó."*

## Qué NO debe sentir

- Que instaló una aplicación.
- Que tiene que aprender a usar algo.
- Que hay una tarea pendiente, un botón que "hay que" tocar.
- Prisa, ni la más mínima.
- Que está mirando una pantalla de carga.

---

## Qué siente la persona al abrir Aurora por primera vez

Silencio, primero. No un silencio vacío — un silencio que se siente intencional, como cuando alguien te dice "esperá, quiero mostrarte algo" y se toma un segundo antes de hacerlo. En ese silencio, la persona no sabe todavía qué es esto. Y no debería tener que saberlo de inmediato: la respuesta emocional correcta al primer instante es *curiosidad tranquila*, no comprensión inmediata.

Recién después de esa pausa, algo aparece — despacio, nunca de golpe. Y cuando aparece, tiene que sentirse menos como "cargó la página" y más como "alguien encendió una luz despacio".

## Qué ve primero

Nada más que espacio y color. Antes que cualquier palabra, antes que cualquier estructura — solo el fondo, quieto, como una habitación antes de que alguien prenda la luz del todo. Ningún elemento interactivo visible todavía.

Recién en el segundo momento aparece el nombre de la historia (el destino, el título) — solo, sin nada más alrededor, con espacio de sobra. Nada compite con eso.

## Qué no debe ver

- Ningún ícono de aplicación, ningún splash screen, ninguna marca técnica.
- Ningún botón: "Comenzar", "Entrar", "Siguiente", "Explorar". Ninguno.
- Ninguna palabra que suene a estructura de producto: "capítulos", "progreso", "inicio", "menú".
- Ninguna lista de "qué se puede hacer acá".
- Ningún indicador de carga técnico (spinner, barra, porcentaje).
- Ninguna pista de contenido de un capítulo — ni un lugar, ni una actividad, ni un nombre propio de la ciudad más allá del título general.
- El capítulo especial no existe todavía en este momento — ni una sombra de su existencia.

## Qué información se revela

En este orden, y solo en este orden:

1. El destino y el título de la historia.
2. El mensaje de bienvenida — la única voz humana que habla en este primer minuto.
3. Recién al final, la cuenta regresiva — el único dato "funcional" que se permite acá, porque ya está sancionado como la excepción de `pre_trip` (`08_State_machine.md`).
4. Una insinuación visual, muy suave, de que existe una estructura más grande (los capítulos, todavía "Todavía no") — pero como paisaje de fondo, nunca como una lista para explorar.

## Qué información permanece oculta

- Cualquier actividad, lugar, o detalle de contenido de un día específico.
- Los nombres propios de los protagonistas (si los hay) — pueden esperar a un momento con más intimidad ganada, no al primer segundo.
- Todo lo referido a Memory Engine — capturar un recuerdo no le pertenece a este momento, le pertenece a un capítulo.
- El capítulo especial / epílogo, incluso su existencia.
- Cualquier control de navegación real (nada es todavía "clickeable" en el sentido de estructura de app).

## Qué animaciones existen

- Un fundido lento del fondo, antes que cualquier texto — establece el ritmo de todo lo que sigue.
- El título aparece con un fundido suave, nunca con un efecto llamativo (nada de "letra por letra", nada que se sienta como una demostración técnica).
- Una pausa real (no una animación, un silencio deliberado) entre la aparición del título y la aparición del mensaje de bienvenida.
- La cuenta regresiva aparece última, con la misma suavidad — nunca como un número que "salta" a la vista.
- **No existe ninguna animación de carga.** Si hay una demora técnica real, se cubre con el mismo fundido de bienvenida — nunca con un indicador de progreso.

## Qué ritmo tiene la experiencia

Lento, a propósito, al principio. Este primer minuto no se puede "apurar" tocando la pantalla — no hay nada que saltar, porque no hay ninguna acción esperando. El ritmo es: **silencio → título → pausa → bienvenida → pausa → cuenta regresiva → quietud otra vez.**

No hay una barra de tiempo ni un indicador de cuánto falta para "terminar" esta introducción, porque no es algo que termine — es un estado en el que la persona puede quedarse todo el tiempo que quiera, sin que nada la empuje a seguir.

## Qué debe pasar antes de que pueda comenzar el primer capítulo

Nada que dependa de la persona. El primer capítulo se abre solo, cuando llega su fecha — nunca por una acción humana como tocar "Comenzar". Este primer minuto no le pide nada a nadie: ni completar un perfil, ni aceptar términos con voz de marca disfrazada, ni tocar nada para "confirmar que está lista".

La única condición real es el paso del tiempo. Mientras tanto, esta pantalla tiene que sentirse **completa por sí misma** — no como una sala de espera ni como algo "todavía sin terminar". Si alguien cierra la aplicación acá y no vuelve a abrirla hasta el día del viaje, la experiencia de este primer minuto ya cumplió su propósito entero.

---

## ¿Por qué este momento existe?

Porque la primera impresión decide todo lo que viene después, y no hay una segunda oportunidad de tenerla. Si en los primeros sesenta segundos Aurora se siente como una aplicación —aunque todo lo que venga después esté perfectamente construido— ya perdió la promesa que se hizo a sí misma desde el primer documento que escribimos: *"Aurora nunca debe sentirse como una aplicación. Debe sentirse como abrir un libro."*

Este momento no le enseña nada a la persona sobre cómo usar Aurora, y esa es la idea. Le enseña, en cambio, cómo se va a sentir usarla. Sin este primer minuto — sin ese silencio deliberado antes de cualquier palabra — Aurora sería, técnicamente, exactamente la misma. Emocionalmente, sería otra cosa completamente distinta: una app de viajes con buena redacción, no un libro que alguien preparó con cariño y que empieza a abrirse solo, cuando le toca.

---

*Sin código, sin componentes. A la espera de tu aprobación antes de pasar a la Fase E-2.*
