# EXPERIENCE_ROADMAP.md

**Autor:** Lead Software Architect / Lead Product Designer
**Alcance:** Visión de producto para la Etapa 2 de Aurora — la experiencia. Sin backend, sin Cloudinary, sin MongoDB, sin sincronización.
**Estado:** Documento de visión. Sin código, sin implementación. A la espera de aprobación.

---

## Punto de partida

El motor ya existe y funciona: `experience.html` calcula bien los 4 momentos de la historia, guarda progreso, guarda notas. Pero hoy se **ve y se siente como una página web que muestra datos correctos** — no como un libro que se despierta cada día. La Etapa 1 nos dio la verdad de los datos. La Etapa 2 tiene que darles calidez.

**Nota de nomenclatura:** para no confundir estas fases con las Fases 1–9 de la Etapa 1 (que fueron de motor), les voy a llamar **Fase E-1, E-2, E-3...** ("E" de Experiencia) durante toda esta etapa.

La pregunta que filtra cada decisión de acá en adelante, tal como la planteaste: **¿esto ayuda a que la persona recuerde mejor este momento dentro de diez años?**

---

# 1. Orden ideal de las próximas fases

| Fase | Nombre | Depende de |
|---|---|---|
| **E-1** | El Primer Contacto (la portada) | Nada — es lo primero que ve cualquiera |
| **E-2** | El Ritual de Apertura de Capítulo | E-1 (comparten lenguaje visual) |
| **E-3** | La Captura de Recuerdos como Regalo | E-2 (vive dentro del capítulo ya rediseñado) |
| **E-4** | El Ritual de Cierre de Capítulo | E-2 (es su contraparte simétrica) |
| **E-5** | El Epílogo — El Cumpleaños | Puede diseñarse en paralelo a E-2/E-3/E-4 (ver §9) |
| **E-6** | La Transformación — Entrando a Memory Mode | E-4 y E-5 (necesita que el último capítulo y el epílogo ya tengan su ritual de cierre) |
| **E-7** | Revivir — una primera versión humilde del álbum | E-6 |
| **E-8** | El Eco del Aniversario | Puede diseñarse en paralelo desde el día uno (ver §9) |

La lógica del orden: primero lo que un viajero real toca todos los días (el capítulo, abrirlo y cerrarlo), después el momento más importante emocionalmente (el epílogo), después la bisagra hacia "esto ya es un recuerdo" (la transformación), y recién al final lo que se disfruta después del viaje (revivir, aniversario).

---

# 2. Momento emocional que busca cada fase

- **E-1:** Anticipación tranquila. *"Esto no es una app más — es algo que empieza antes de que el viaje empiece."*
- **E-2:** Expectativa suave al despertar. *"Hoy también hay algo esperándome."*
- **E-3:** Gratitud en el instante. *"Esto que estoy viviendo ahora vale la pena guardarlo, ya."*
- **E-4:** Descanso con nostalgia anticipada. *"Hoy fue suficiente. Mañana sigue."*
- **E-5:** Asombro y ternura — el único momento donde el protagonismo es de una sola persona.
- **E-6:** Asombro silencioso. Un antes y un después que se nota sin que nadie lo anuncie.
- **E-7:** Nostalgia cálida, casi orgullo compartido. *"Mirá todo lo que guardamos."*
- **E-8:** Sorpresa entrañable, un año después. *"Seguimos siendo nosotros."*

---

# 3. Qué pantallas aparecerán

- **E-1:** una portada rediseñada de `pre_trip`, con más espacio en blanco y una cuenta regresiva que respira, no que informa.
- **E-2:** una pantalla intermedia nueva — "portada del capítulo de hoy" — antes de mostrar cualquier actividad. Hoy no existe: el capítulo se muestra todo junto, de una.
- **E-3:** un momento de captura contextual, disparado desde cada recuerdo sugerido (`suggestedMemories`), no un formulario genérico siempre visible.
- **E-4:** una pantalla de cierre dedicada — hoy cerrar un capítulo es instantáneo, sin ningún momento propio.
- **E-5:** una familia visual completa y distinta para el epílogo (hoy reutiliza, en los hechos, el mismo lenguaje visual de un capítulo regular).
- **E-6:** una pantalla de transformación, breve y única — se ve una sola vez en toda la vida de la historia.
- **E-7:** una vista de "revivir" real, aunque humilde (lista de recuerdos favoritos, no un álbum completo) — hoy `memory_mode` es un solo párrafo.
- **E-8:** una pantalla de aniversario — hoy no existe en absoluto.

# 4. Qué pantallas desaparecerán

- El "volcado total" del capítulo (actividades + lugares + photo spots + colecciones + recuerdos sugeridos + formulario, todo junto, todo a la vez) desaparece como patrón — se reemplaza por revelado progresivo (E-2, E-3).
- El formulario de nota permanentemente visible (selector de actividad + textarea + botón, siempre ahí) desaparece a favor de una captura disparada por contexto (E-3).
- La transición instantánea y silenciosa de `in_progress` a `memory_mode` desaparece — pasa a tener un momento propio (E-6).
- El párrafo único y plano de `memory_mode` desaparece a favor de la vista de revivir (E-7).

**Nada de esto toca `debug.html` ni `memories.html`** — siguen siendo herramientas de desarrollo, exentas a propósito de estas reglas de experiencia.

# 5. Qué transiciones existirán

- **Respiro de entrada:** cada pantalla nueva aparece con una pausa breve antes de mostrar contenido — nunca un salto duro de un estado al siguiente.
- **Pasar de página:** abrir un capítulo se siente como dar vuelta una hoja, no como que el contenido "aparece".
- **Apagar la luz:** cerrar un capítulo oscurece/desvanece gradualmente — el opuesto exacto del respiro de entrada.
- **El telón cambia:** entrar al epílogo usa una transición distinta a cualquier otra — es la señal, sin palabras, de que hoy se rompen las reglas.
- **La bisagra:** la transición hacia Memory Mode es la más importante de todo el producto — tiene que sentirse como el instante exacto en que el viaje se convierte en recuerdo.
- **Reaparición suave:** abrir un recuerdo ya guardado (en E-7) nunca aparece de golpe, aparece como quien abre un cajón despacio.

# 6. Qué animaciones aportan valor

Siguiendo `03_Design_Principles.md` ("cada animación debe tener una razón — son respiraciones"):

- Aparición gradual del contenido de un capítulo nuevo (simula abrir los ojos a un día nuevo).
- Un pequeño gesto al guardar una nota — no un aviso técnico, un instante de confirmación cálida.
- El corazón de favorito "respira" o se llena al tocarlo, en vez de cambiar de texto de golpe.
- El cambio de fondo/ícono al entrar a Memory Mode — sutil, una sola vez, nunca repetible.
- El oscurecimiento al cerrar un capítulo, con el tiempo suficiente para sentirlo (nunca instantáneo).

**Ninguna otra animación se justifica todavía.** Si una animación no tiene una de estas razones detrás, no entra.

# 7. Qué interacciones deben sentirse mágicas

- Que el capítulo de hoy simplemente **esté ahí**, sin que nadie tenga que buscarlo.
- Que guardar una nota se sienta como agregarle una página a un diario, no como enviar un formulario.
- Que cerrar un capítulo tenga el peso real de una decisión — irreversible, pero acompañada, nunca fría.
- Que el paso a Memory Mode se **descubra**, no se anuncie con un mensaje.
- Que abrir el epílogo se note distinto desde el primer segundo, sin tener que leer una sola palabra para darse cuenta.

# 8. Qué debemos evitar para no romper la filosofía de Aurora

- Barras de progreso, porcentajes, contadores de avance del viaje.
- Insignias, logros desbloqueados, cualquier vocabulario de gamificación.
- Popups pidiendo calificación, reseña, o cualquier cosa parecida.
- Animaciones decorativas sin una razón emocional detrás (ver §6).
- Mostrar dos capítulos a la vez, o cualquier pista del contenido de un capítulo todavía bloqueado.
- Lenguaje técnico en cualquier transición o confirmación ("Cargando...", "Guardado exitosamente", "Error").
- Urgencia artificial: temporizadores, "últimos X días", cualquier presión de tiempo que no sea la cuenta regresiva ya aprobada de `pre_trip`.
- Convertir la captura de recuerdos en una tarea o un checklist que "hay que completar".
- Sonido o vibración que la persona no buscó explícitamente.

# 9. Qué fases pueden desarrollarse en paralelo

- **E-1 y E-8** son completamente independientes entre sí y del resto — no comparten pantalla ni estado. Se pueden diseñar y construir en paralelo desde el primer día.
- **E-5** (el epílogo) no comparte superficie visual con el capítulo regular una vez que se le da su propia familia de estilos — puede avanzar en paralelo a **E-2/E-3/E-4**, con una persona (o vos, en otro momento) enfocada exclusivamente ahí.
- **E-2 y E-4** comparten la misma pantalla (el capítulo), aunque son rituales distintos (abrir vs. cerrar). Recomiendo **diseñarlos en paralelo pero implementarlos en la misma pasada**, para no rediseñar el mismo componente dos veces.
- **E-3** depende de cómo termine E-2 (vive adentro de esa pantalla) — no conviene paralelizarla con E-2, sí se puede preparar su diseño conceptual mientras tanto.
- **E-6 y E-7** son estrictamente secuenciales entre sí y respecto a E-4/E-5 — no hay forma honesta de paralelizarlas.

# 10. Roadmap hasta Aurora v1

**Aurora v1 (versión completa según lo que ya decidimos que entra en v1) queda así:**

1. Motor completo y probado — **ya está** (Etapa 1).
2. Las 4 etapas narrativas con ritual real, no solo con datos correctos — **Etapa 2, fases E-1 a E-6**.
3. Una primera experiencia de "revivir" humilde, sin álbum completo todavía — **E-7**.
4. El eco del aniversario diseñado y construido — **E-8**.

**Lo que sigue quedando fuera de v1 a propósito**, sin que esto sea una omisión: fotos/videos reales, Album Engine completo, backend/sincronización entre dispositivos, PWA, Notification Engine, Story Access, multi-historia. Esas piezas no dejan de importar — dejan de ser parte de **esta** etapa, tal como ya lo habíamos decidido en `PROJECT_STATUS_V1.md`.

**Una tensión que quiero dejar explícita, no resuelta en silencio:** Aurora promete ser, con el tiempo, un álbum con fotos — y esta etapa no toca Cloudinary ni subida de archivos. Para E-7 (Revivir) propongo diseñar ya el **espacio visual reservado para una fotografía** (un lugar cálido, tipo "todavía no hay una foto acá", nunca un ícono roto ni un placeholder técnico) aunque hoy no se pueda llenar de verdad — así la experiencia ya está preparada emocionalmente para el día en que las fotos existan, sin haber tocado una sola línea de backend ahora.

---

*Sin código, sin implementación. A la espera de tu aprobación antes de generar el primer documento de fase (E-1).*
