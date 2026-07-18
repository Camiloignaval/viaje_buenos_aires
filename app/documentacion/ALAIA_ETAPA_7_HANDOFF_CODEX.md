# PROMPT DEFINITIVO PARA CODEX — Ronda final Día Vivido

> Handoff de dirección artística cerrado. Parte de la implementación actual (ya existe). Corrige solo lo listado. No reinterpretes nada. Todo valor visual (color, medida, inclinación, fuente, sombra) se toma del artefacto `alaia-dia-vivido.html` y de `ALAIA_ETAPA_7_DIA_VIVIDO_SPEC.md`. Donde este prompt y la spec discrepen, manda este prompt.

---

## 1. Objetivo

Llevar la implementación actual del Día 1 desde "app en dark mode con buena tipografía" hasta "una hoja de libro". La prosa, la foto-objeto, el filete, la marginalia y el insight tejido **ya están bien y se conservan**. Lo que falta es atmósfera y ritmo: devolver el **papel** en lugar del negro, **sacar todo el cromo de app** (topbar y pill flotante), **esconder la maquinaria de edición**, y **romper la plantilla repetida** devolviendo escasez y las cuatro composiciones. Al terminar, al primer golpe de vista debe leerse un libro, no una aplicación. Es una sola ronda de correcciones, no un rediseño.

---

## 2. Restricciones (intacto — no tocar)

- **No** modifiques arquitectura, motores, stores, hooks de datos, ni la lógica del motor de roles/StoryIntelligence.
- **No** elimines ninguna capacidad de la sección 11 de la spec (fotografía de referencia, photo spot, multi-foto, galería, lightbox, mapa, navegación, cómo llegar, tiempo, costos, MoneyLine, presupuesto, clima, Companion, favoritos, edición, eliminación, compartir, álbum, colecciones, lugares relacionados). Solo cambia **cuándo, cómo y con cuánto protagonismo** aparecen.
- **No** inventes colores, fuentes, medidas ni composiciones nuevas. Solo existen cuatro composiciones. Todo valor sale del artefacto aprobado.
- **No** crees componentes nuevos si puedes lograr el resultado con los existentes.
- **No** toques el contenido de datos (`story-ba2026.json`): no reescribas prosa, títulos ni traducciones.
- Conserva ambos temas (claro y oscuro) y el soporte responsive existente.

---

## 3. Correcciones obligatorias

### T1 · Superficie de papel, no negro
- **Prioridad:** P0
- **Archivos probables:** `experience.css`.
- **Qué cambiar:** reemplaza el fondo negro plano de la vista de lectura por la superficie de **papel cálido oscuro** del artefacto (equivalente a `#14161d`), con su grano sutil y el glow radial superior. En claro, papel `#e8e1d0`.
- **Qué NO cambiar:** el color de la prosa, los títulos ni el acento.
- **Validar:** el fondo tiene temperatura y textura; no queda ningún `#000`/negro puro de borde a borde.

### T2 · Eliminar todo el cromo de app
- **Prioridad:** P0
- **Archivos probables:** `ReadingTopbar.tsx`, `ExperienceView.tsx`, y el consumidor que renderiza el pill flotante "Viaje conectado" (probable `VisibleCompanionExperience.tsx` o `PushCompanion.tsx`).
- **Qué cambiar:** elimina la topbar persistente "← Volver al índice / ✷ Alaia Día" de las vistas de lectura. Elimina el botón/pill flotante inferior-derecho "Viaje conectado". El volver al índice se invoca desde el índice único adelante, no desde una barra fija.
- **Qué NO cambiar:** la capacidad de navegar al índice y de ver el Companion siguen existiendo; solo dejan de vivir como cromo fijo. El Companion habla dentro del texto como mano cobalt.
- **Validar:** en cualquier scroll de lectura no hay barra superior fija ni botón flotante; la hoja está limpia arriba y abajo.

### T3 · El libro como objeto (tomo)
- **Prioridad:** P0
- **Archivos probables:** `experience.css` (contenedor `.book`/raíz de lectura).
- **Qué cambiar:** contén la hoja en un ancho máximo tipo tomo con la **sombra de cantos apilados** del artefacto; que se vea un volumen apoyado sobre la superficie, no un lienzo full-bleed.
- **Qué NO cambiar:** el flujo de scroll continuo del día.
- **Validar:** la hoja tiene borde/canto y sombra; se percibe encuadernada, no infinita.

### T4 · Esconder el susurro de edición
- **Prioridad:** P0
- **Archivos probables:** `Memories.tsx` (recuerdo guardado), `experience.css`.
- **Qué cambiar:** el recuerdo guardado en reposo **no muestra ningún link ni botón**. Las acciones (*retocar la línea · sumar una foto · retocar las fotos · compartirlo aparte · soltarlo*) se revelan solo tras un gesto: hover discreto en desktop, long-press en mobile. En reposo, cero controles visibles.
- **Qué NO cambiar:** todas esas acciones siguen existiendo y accesibles por teclado (afordancia enfocable que abre el susurro).
- **Validar:** una captura del recuerdo guardado en reposo no muestra ninguna fila de links; aparecen solo al interactuar.

### T5 · Escasez de la casilla que espera
- **Prioridad:** P0
- **Archivos probables:** `ChapterSections.tsx` (ActivityPage), `Modes.tsx` (InProgress).
- **Qué cambiar:** la lámina vacía que espera aparece **solo en beats con peso de recuerdo** (composiciones Pleno y Pausa). **Máximo 2–3 por día.** Los beats Umbral, Caminado y Cierre **no** llevan casilla. Elimina la repetición de la casilla en cada actividad.
- **Qué NO cambiar:** el photo spot y la invitación a guardar siguen existiendo donde corresponde.
- **Validar:** contar casillas vacías en el día ≤ 3; llegada, caminata y cierre no muestran ninguna.

### T6 · Aplicar las cuatro composiciones
- **Prioridad:** P1
- **Archivos probables:** `ChapterSections.tsx` (selección de composición en ActivityPage), `experience.css`, `chapterActivitySequence.css`.
- **Qué cambiar:** aplica la composición por rol según §2 de la spec, con prioridad (primera que matchea gana): **Umbral/Cierre** (llegada/logística y night-note) = breve, sin lámina; **Pausa** (Rapanui / ourMoment) = columna angosta centrada en itálica, mucho aire; **Caminado** (Corrientes) = medida ancha, sin lámina vertical; **Pleno** (El Cuartito, cena) = grilla prosa + margen + lámina. Cada composición debe diferir en medida y densidad.
- **Qué NO cambiar:** el orden de beats ni los datos.
- **Validar:** una captura de cada beat se distingue visualmente de las otras; no hay cuatro bloques idénticos apilados.

### T7 · Devolver el clímax
- **Prioridad:** P1
- **Archivos probables:** `ChapterSections.tsx`, `experience.css`.
- **Qué cambiar:** el beat icónico del día (Obelisco) se renderiza como **Pleno en variante centrada**: prosa centrada, lámina/espacio grande y centrado. Exactamente **uno por día**.
- **Qué NO cambiar:** el resto de beats permanece en su composición.
- **Validar:** hay un único beat con tratamiento centrado y de mayor escala; el día tiene un pico visible.

### T8 · La lámina vacía como papel, no como vacío
- **Prioridad:** P1
- **Archivos probables:** `experience.css`, componente de la casilla que espera.
- **Qué cambiar:** el marco vacío usa el fondo de **papel rayado cálido** (`ph-blank` del artefacto) con esquineros. **Elimina la palabra "(esperando)"** de la línea susurrada; la línea queda solo con la voz a mano ("acá podría ir una foto de este momento").
- **Qué NO cambiar:** los esquineros y el rol de invitación.
- **Validar:** la casilla vacía se lee como marco de montaje cálido, nunca como imagen rota o estado de carga; no aparece la palabra "esperando".

### T9 · Marcador de escena a mano, no reloj
- **Prioridad:** P1
- **Archivos probables:** `ChapterSections.tsx` (ChapterHero / cabecera de actividad), `experience.css`.
- **Qué cambiar:** reemplaza el rango horario en sans ("11:20–12:50") por el **momento en fuente manuscrita cobalt** (`activity.moment`, ej. "mediodía"). Si un beat no tiene `moment`, **no muestres hora**; no imprimas rangos de reloj.
- **Qué NO cambiar:** el dato de horario sigue disponible en la información práctica plegada si existe.
- **Validar:** ninguna cabecera de escena muestra un rango de reloj; muestran voz manuscrita o nada.

### T10 · Marginalia con límite y nombre propio
- **Prioridad:** P1
- **Archivos probables:** `ChapterSections.tsx` (marginalia fusionada), `experience.css`.
- **Qué cambiar:** **máximo 1–2 notas al margen por pasaje.** Cada nota lleva una **label específica** (ej. "La costumbre", "Algo que descubrimos"). Prohibida la etiqueta genérica "AL MARGEN". Si sobran notas, pliega el excedente en un dato práctico o descártalo; nunca las apiles en columna.
- **Qué NO cambiar:** el contenido de las notas ni su capacidad de existir.
- **Validar:** ningún pasaje muestra más de 2 notas al margen; no aparece "AL MARGEN"; no hay columna de bloques etiquetados.

### T11 · Fecha narrativa del sello
- **Prioridad:** P1
- **Archivos probables:** `Memories.tsx`, `lib/format.ts`, componente de caption/sello.
- **Qué cambiar:** la fecha estampada en la lámina usa **el día del viaje del beat** (ej. 18 de julio), no el `created-at` de la foto ni la fecha del sistema. Debe ser coherente con el masthead del día.
- **Qué NO cambiar:** el formato manuscrito/versalita del sello.
- **Validar:** ninguna fecha estampada contradice el día del masthead; no aparecen fechas de subida ("16 DE JUL" en un día rotulado "18 de julio").

### T12 · Eliminar la línea vertical central
- **Prioridad:** P2
- **Archivos probables:** `experience.css`.
- **Qué cambiar:** elimina el rule vertical que parte la hoja al medio y atraviesa títulos y filetes.
- **Qué NO cambiar:** los filetes horizontales entre escenas.
- **Validar:** no hay ninguna línea vertical recorriendo la página.

### T13 · Corregir la colisión de la capital sobre la foto
- **Prioridad:** P2
- **Archivos probables:** `experience.css`, `Memories.tsx`.
- **Qué cambiar:** ninguna capital ornamental (drop cap) se monta encima de la lámina del recuerdo. Corrige el solapamiento del glyph sobre la foto guardada.
- **Qué NO cambiar:** la capital ornamental al inicio de la prosa.
- **Validar:** la lámina del recuerdo se ve limpia, sin letras encima.

### T14 · Jerarquía del masthead sobre los títulos de beat
- **Prioridad:** P2
- **Archivos probables:** `experience.css` (escala tipográfica), `Cover.tsx`/`ChapterSections.tsx`.
- **Qué cambiar:** aumenta el contraste de escala entre el **título del día** (masthead, dominante) y los **títulos de beat** (subordinados, menor peso). El masthead debe dominar la apertura.
- **Qué NO cambiar:** las fuentes ni los textos.
- **Validar:** en la apertura, el título del día se impone; ningún título de beat compite en tamaño con él.

### T15 · Sin índice repetido al pie del capítulo
- **Prioridad:** P1
- **Archivos probables:** `Modes.tsx` (InProgress/Epilogue/MemoryMode), `ExperienceView.tsx`.
- **Qué cambiar:** el capítulo **no termina con el índice de capítulos**. El índice vive una sola vez, adelante, y se invoca. Al pie del día solo queda el cierre editorial (night-note) y, si acaso, el acceso al álbum como texto discreto.
- **Qué NO cambiar:** la existencia del índice adelante ni el acceso al álbum.
- **Validar:** al final del día no aparece una lista de capítulos ni barra de navegación.

---

## 4. Reglas nuevas (cierran ambigüedades de la spec — obligatorias)

Estas tres reglas se integran a `ALAIA_ETAPA_7_DIA_VIVIDO_SPEC.md` y son vinculantes:

1. **Escasez de la casilla que espera.** La lámina vacía aparece solo en beats con peso de recuerdo (Pleno y Pausa), máximo 2–3 por día. Umbral, Caminado y Cierre nunca la muestran. (Anula la lectura literal de "una casilla por beat".)
2. **Límite de marginalia.** Máximo 1–2 notas al margen por pasaje, cada una con label específica. Prohibida la label genérica "AL MARGEN". El excedente se pliega o se descarta; nunca se apila en columna de widgets.
3. **Fecha narrativa del sello.** El sello usa el día del viaje del beat, no el `created-at` de la foto ni la fecha del sistema.

---

## 5. Checklist de aceptación

Codex no puede declarar "listo" sin verificar y adjuntar captura de cada ítem:

- [ ] **Desktop** — hoja de papel, sin cromo, sin línea central.
- [ ] **Mobile** — margen colapsa bajo la prosa; gesto de edición por long-press.
- [ ] **Claro** — papel `#e8e1d0`; jerarquía y acento legibles.
- [ ] **Oscuro** — papel cálido `#14161d`, nunca negro plano.
- [ ] **Pleno** — prosa + margen + lámina, distinguible.
- [ ] **Caminado** — medida ancha, sin lámina vertical.
- [ ] **Pausa** — columna angosta centrada, mucho aire.
- [ ] **Umbral** — breve, sin lámina ni casilla.
- [ ] **Casilla vacía** — papel rayado cálido con esquineros, sin "(esperando)".
- [ ] **Casilla llena** — lámina montada, inclinada, con fecha del viaje coherente.
- [ ] **Favoritos** — sello (lacre) en esquina, no corazón toggle; accesible.
- [ ] **Companion** — mano cobalt dentro del texto, no pill flotante.
- [ ] **Marginalia** — máx. 2 por pasaje, labels específicas, sin columna de widgets.
- [ ] **Datos prácticos** — plegados, cerrados por defecto.
- [ ] **MoneyLine** — intacto donde vive el costo; sin montos fabricados.
- [ ] **Álbum** — accesible; recibe lo que no entra en el flujo.
- [ ] **Performance** — sin regresiones de carga respecto a la versión actual.
- [ ] **Responsive** — sin scroll horizontal; láminas dentro del ancho de lectura.
- [ ] **Accesibilidad** — casilla y sello con rol/label; susurro alcanzable por teclado; foco visible; `prefers-reduced-motion` respetado.
- [ ] **Tests** — la suite de `features/experience` pasa en verde; typecheck limpio.

---

## 6. Criterio de éxito

La implementación está terminada cuando, al abrir el Día 1 y hacer scroll de llegada a cierre, **una persona diría "esto es un recuerdo", no "esta es una app"** — sin que se lo expliquen. En concreto:

- Al primer golpe de vista no hay ningún elemento que delate una aplicación: ni barra fija, ni botón flotante, ni fondo negro plano, ni módulos idénticos repetidos.
- El día **tiene ritmo**: los beats respiran distinto, hay un pico (Obelisco) y hay silencios (Rapanui).
- El recuerdo **vive dentro del relato** y en reposo no muestra maquinaria.
- Nada de lo que la app hacía dejó de poder hacerse; solo dejó de gritar.

Si los 15 puntos, las 3 reglas nuevas y el checklist completo se cumplen y se ve como un libro, la dirección artística del Experience queda cerrada. La siguiente etapa es únicamente implementación de contenido.
