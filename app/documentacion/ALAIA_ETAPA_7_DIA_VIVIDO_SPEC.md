# Alaia · Especificación de implementación — El Día Vivido

**Estado:** dirección creativa aprobada y cerrada. Referencia visual obligatoria: el artefacto `alaia-dia-vivido.html` (mockup del Día 1). Esta spec es fiel a ese artefacto; ante cualquier duda, el artefacto manda.

**Regla que gobierna todo:** *que nadie sienta que abre una aplicación; que todos sientan que abren un recuerdo.* Vivir, guardar y volver a leer un momento ocurren en la misma hoja del mismo libro.

**Alcance:** transformar el render del capítulo en curso (`InProgress`) y el ciclo del recuerdo, para el Día 1 real de Buenos Aires. No se crean motores, stores ni pantallas nuevas. No se toca la lógica de datos ni el motor de roles: se cambia cómo se compone y se lee.

---

## 0. Sistema visual heredado (no se reinventa)

Tokens ya existentes en el manifiesto/experience. Usar exactamente estos, no introducir nuevos colores ni fuentes.

- **Fuentes:** `--didone` (títulos), `--serif` = Iowan Old Style (prosa), `--plaque` = Copperplate (labels en versalitas), `--hand` = script (voz manuscrita: caption, Companion, línea susurrada), `--sans` (solo utilitario).
- **Color claro:** paper `#e8e1d0`, paper-2 `#ded5c1`, mat `#f1ebde`, ink `#1b2334`, ink-soft `#464d5c`, ink-faint `#8b8571`, brass `#9c7c3d`, cobalt `#2c4a7a`, filete `#a6402f`. (Variantes oscuras ya definidas en tokens; respetar ambos temas.)
- **Separador de escena:** el **filete** (ornamento SVG + hairlines), nunca un `border` ni un `<hr>` de card.
- **Ritmo:** el blanco es contenido. La densidad la da el espacio, no los contenedores.

---

## 1. Las cuatro composiciones (especificación visual definitiva)

Son cuatro. No hay una quinta. El beat "icónico/clímax" (Obelisco) **es Pleno en variante centrada**, no una composición aparte.

### A · Pleno — la escena
- **Uso:** la escena principal de un lugar (comida, hito, descubrimiento). Beat memorable.
- **Layout:** grilla de dos columnas — prosa (`1fr`) + columna de margen (`12.5rem`), gap `2.4rem`.
- **Contiene:** cabecera de escena → prosa (con el *insight* tejido, capital al inicio) → marginalia al costado → el espacio que espera / recuerdo, integrado tras la prosa.
- **Foto:** una lámina, montada, inclinada (`-2°` / `+1.6°`). Escasa.
- **Variante centrada (clímax/icónico):** prosa centrada (`max 34rem`), la lámina/espacio grande y centrado. Se usa **solo** en el pico visual del día (uno por día como máximo).

### B · Caminado — el trayecto
- **Uso:** movimiento entre lugares, una avenida, una transición sin venue fijo.
- **Layout:** medida ancha, prosa que respira, poca o nula columna de margen. Aire.
- **Contiene:** cabecera → prosa larga → (opcional) la mano de Alaia / Companion → como mucho una marginalia.
- **Foto:** ninguna, o una **panorámica** (`260×150`), nunca vertical.

### C · Pausa — el momento íntimo
- **Uso:** la pausa, el momento nuestro (hoy `OurMoment`).
- **Layout:** columna angosta (`max 30rem`), centrada, prosa en itálica, mucho silencio alrededor.
- **Contiene:** cabecera → 1–2 frases → el espacio que espera en voz íntima. Sin marginalia. Sin datos prácticos.
- **Foto:** una lámina pequeña, centrada, o ninguna.

### D · Umbral / Cierre — abrir y cerrar
- **Uso:** llegada/logística (umbral) y la última línea del día (cierre nocturno, hoy `NightNote`).
- **Layout:** breve. Una o dos líneas.
- **Umbral:** prosa en `ink-soft`, corta; el dato práctico va plegado.
- **Cierre:** una sola frase centrada en `--didone` itálica, precedida de filete, seguida del folio (`— i —`).
- **Foto:** ninguna.

---

## 2. Reglas para asignar composición a cada actividad

La composición **es consecuencia del rol narrativo**, no una decisión visual. El motor de roles ya existe; se mapea así, en orden de prioridad (primera que matchea gana):

1. **¿Es la llegada/logística del día, o la línea de cierre nocturna?** → **D · Umbral/Cierre**.
   Señales: primer beat con categoría logística/traslado; o `nightNote`/cierre del día.
2. **¿Es una pausa íntima?** → **C · Pausa**.
   Señales: `ourMoment` presente, `relax` alto, `energy` bajo, intensidad emocional alta sin ser hito.
3. **¿Es trayecto/movimiento sin venue fijo?** → **B · Caminado**.
   Señales: rol Caminata/Transición; categoría caminata; sin `place` con dirección.
4. **En cualquier otro caso** (escena vivida en un lugar) → **A · Pleno**.
   Variante **centrada** solo si es el pico del día (`esPico`/clímax o hito icónico con `photoMoment`).

Restricciones:
- **Máximo un Pleno centrado por día.**
- **No dos Pausa consecutivas.**
- Si una actividad no tiene contenido suficiente para Pleno (sin prosa, sin lugar), degrada a Umbral (breve), nunca a card vacía.

---

## 3. Anatomía exacta del pasaje

Un pasaje = una actividad. Elementos en este orden. **Todos opcionales salvo cabecera y voz.** Aparecen solo si existe el dato; ausente el dato, no se renderiza nada (ni título, ni contenedor, ni placeholder).

1. **Cabecera de escena** — momento a mano (`--hand`, cobalt, ej. *mediodía*) + título (`--didone`). No usar eyebrow en versalitas como título.
2. **La voz** — prosa en `--serif`. El primer párrafo lleva capital ornamental. **El `insight` va tejido dentro de la prosa**, jamás en un bloque propio.
3. **La lámina** — foto como objeto (ver §5, atom lámina). Escasa.
4. **Marginalia** — en la columna de margen; cada nota = label plaque en versalitas + texto breve. Ver §6.
5. **La mano de Alaia (Companion)** — una sola nota manuscrita cobalt con marcador. Contextual/viva. Máx. una por beat.
6. **El espacio que espera / el recuerdo** — la misma casilla en sus cuatro tiempos (§4).
7. **Dato práctico plegado** — `<details>` con summary en versalitas; cerrado por defecto; aparece solo cuando se busca.

Separación entre pasajes: **filete**. Nunca borde, sombra de card, ni fondo distinto.

---

## 4. Los cuatro estados de la casilla del recuerdo

La casilla ocupa **exactamente el mismo lugar** en los cuatro tiempos. Cambia su contenido, no su posición ni su lenguaje.

- **Antes del viaje:** la hoja espera. La casilla **no se muestra** (no hay nada que llenar). El capítulo se lee sellado: título + insinuación, sin invitación. Copy de referencia: *«Nos espera.»*
- **Durante · sin recuerdo:** **lámina vacía** (marco con esquineros, contorno punteado, sin sombra, fondo transparente/rayado) + **línea susurrada** a mano en `ink-faint` (*«acá podría ir una foto de este momento»*). Invita, no exige. Un solo gesto la abre.
- **Después de guardar:** la **lámina se llena en el mismo lugar** — foto montada, inclinada, con esquineros, epígrafe manuscrito cobalt + fecha estampada en versalitas. Si es favorito, **lacre** en la esquina inferior derecha. La maquinaria de guardado desaparece.
- **Años después:** idéntico al guardado, aún más silencioso. Sin ningún control a la vista. Editar solo mediante gesto que se estira (§5). El día muestra folio y fecha: es un objeto terminado.

**Invariante crítico:** entre "durante" y "guardado" **no cambia el layout**. Guardar = la casilla se llena en su sitio. No hay salto, no hay pantalla nueva, no hay reflow del pasaje más allá de la casilla misma.

---

## 5. Ceremonia del recuerdo (completa)

Secuencia editorial, no flujo de formulario. Ocho pasos:

1. **La invitación es un espacio, no un botón.** Lámina vacía + línea a mano, apoyada donde el recuerdo pertenece (junto a su beat), nunca al final del día ni como acción global.
2. **Se entra tocando la lámina.** No abre modal sobre la página. La casilla misma se vuelve escribible/llenable **in situ**. La hoja no navega a otro lado.
3. **Se escribe sobre la caligrafía.** La línea susurrada se entinta: el texto aparece con la letra de quien viaja (`--hand`, cobalt), no en un `textarea` etiquetado con placeholder de formulario.
4. **La foto se monta, no se sube.** La primera entra en la lámina (inclinada, esquineros). Las siguientes se guardan **detrás** (leve pila, una esquina asomando), no en grilla. El resto vive en el álbum (escasez).
5. **No hay "Guardar".** Termina cuando hay una foto **o** una línea. La lámina se asienta (micro-transición de apoyo), se estampa la fecha, y los controles se disuelven solos. Guardar = el pasaje se transforma.
6. **El favorito se estampa.** Un gesto presiona un **lacre de bronce** en la esquina. No togglea un corazón. Etiqueta en primera persona (*«De los que no queremos olvidar»*). Reversible, pero se siente como sello.
7. **Editar es estirar la mano.** El recuerdo guardado **no muestra botones**. Un gesto discreto (mantener presionado en desktop: hover→afordancia mínima; en mobile: long-press) revela un **susurro** de opciones: *retocar la línea · sumar una foto · guardarlo aparte · soltarlo*. Nunca toolbar permanente.
8. **Soltar, no eliminar.** Quitar no vive como acción destructiva impresa en la hoja. Se invoca desde el susurro y se pregunta en voz baja (*«¿Lo soltamos? Podés conservarlo.»*). Sin botón rojo, sin `memory-action-remove` sobre la página.

---

## 6. Mapeo de componentes actuales

### Sobreviven — transformados (cambian de responsabilidad)
- **`ChapterHero`** → cabecera del día (masthead de la hoja). Ya no encabeza una pila de secciones.
- **`ActivityPage` / `ChapterActivitySequence`** → **el pasaje** y su secuencia. Es la unidad fundamental. Responsabilidad nueva: elegir composición (§2) y componer prosa+margen+recuerdo, no apilar sub-secciones.
- **`OurMoment`** → composición **Pausa** (C). Pierde su `section-title`; gana silencio.
- **`NightNote`** → composición **Cierre** (D). Última voz del día. (Ya sin emoji.)

### Se fusionan
- **`PhotoSpots` + `GeneralMemories` + `MemoryInvitation`** → **el espacio que espera** (una casilla por beat + una casilla de día en el cierre). El photo spot es el marco vacío; no es sección aparte.
- **`Traditions` + `MicroDiscoveries` + `CollectionItems` + `DayNote (planB/extraTime)`** → **marginalia** en la columna de margen, junto a su lugar.
- **`MemoryGallery` + controles de edición (`SavedMemory` toolbar)** → **el objeto guardado** + el **gesto que se estira** (§5.7–5.8). Desaparece la toolbar; desaparecen los modos `editing/managing/confirming-delete` como UI permanente.

### Desaparecen como categoría
- **`RelatedPlaces`** como lista: un lugar cercano es otro pasaje corto o una mención al margen. Nunca una sección titulada.
- Todo **`section-title` repetido**: «Tradiciones», «Descubrimientos», «Lugares relacionados», «Nuestro momento», «Recuerdos».
- La **toolbar** del recuerdo (`♥/♡` toggle, «Editar», «Sumar fotos», «Quitar fotos», «Quitar el recuerdo», «Guardar cambios/Cancelar/Listo»).
- El **`<IndexPage />` al pie de cada modo** (`InProgress`, `Epilogue`, `MemoryMode`, cierre). El capítulo ya no termina con un índice repetido. El índice vive **una sola vez, adelante**, y se invoca; no se imprime al final de cada hoja.

### Reglas de destino de cada dato (marginalia vs Companion vs plegado)
- **Conocimiento autorado y permanente** (tradición, microdescubrimiento, insight, plan B) → **marginalia**. (El insight es la excepción: va tejido en la prosa, no al margen.)
- **Información viva o contextual** (clima, hora dorada, cambios del día) → **Companion** (la mano de Alaia), no widget.
- **Acción práctica** (cómo llegar, cómo cruzar, costo) → **plegada**, aparece solo cuando se busca. El costo usa `MoneyLine` (ARS + conversión viva); **no se fabrican montos**: si no hay precio autorado, no se muestra precio.

---

## 7. Comportamiento desktop y mobile

- **Desktop (≥ 641px):** grilla de pasaje a dos columnas (prosa `1fr` + margen `12.5rem`, gap `2.4rem`). La marginalia vive **al costado**, alineada al bloque de prosa. El gesto de edición aparece por hover discreto (afordancia `···` de bajo contraste).
- **Mobile (≤ 640px):** la columna de margen **colapsa debajo** de la prosa (una sola columna); la marginalia se lee como nota indentada tras el párrafo, no como pila de widgets a ancho completo. El gesto de edición es **long-press** sobre la lámina; el susurro aparece como hoja inferior breve, no como menú de app.
- **Fotos:** en el flujo, lámina vertical `~150×176` (desktop) escalando fluido; panorámica `~260×150` solo en Caminado. En mobile, la lámina se centra y no supera el ancho de lectura. **Escasez igual en ambos:** máx. ~2–3 láminas por día en el flujo; el resto al álbum.
- **El día siempre es un scroll continuo** (una hoja), en ambos. No hay tabs, no hay carrusel de secciones, no hay paginación de módulos.

---

## 8. Accesibilidad e interacción

- **Semántica:** cada pasaje es un `article` con su `h2`; el día tiene un encabezado de nivel superior. La marginalia es `aside`. El dato práctico es `details/summary` nativo (teclado + lector de pantalla gratis).
- **La casilla que espera es un control accesible:** rol de botón, `aria-label` claro (*«Guardar un recuerdo de este momento»*), foco visible (`outline` brass, offset 3px). El silencio visual **no** significa silencio semántico.
- **El favorito/lacre:** control con `aria-pressed` que refleje estado; etiqueta que cambie (*«Marcar entre los que no queremos olvidar»* / *«Uno de los que no queremos olvidar»*). Visualmente sello; semánticamente toggle accesible.
- **El gesto que se estira debe tener equivalente accesible:** además de hover/long-press, una afordancia enfocable por teclado que abra el susurro. Nunca esconder funciones de forma inalcanzable.
- **Soltar un recuerdo:** siempre pasa por confirmación en voz baja; foco atrapado en el susurro mientras está abierto; Escape lo cierra conservando el recuerdo.
- **Movimiento:** respetar `prefers-reduced-motion` — la micro-transición de "asentado" al guardar se reduce a un cambio de estado sin animación.
- **Contraste:** validar prosa y labels sobre paper en claro y oscuro; los `ink-faint`/`corner` decorativos no portan información crítica sola.

---

## 9. Límites duros (para que esto no vuelva a ser una app)

Codex **no debe**, bajo ninguna interpretación:

- Envolver pasajes, recuerdos ni marginalia en **cards** (sin `border`, sin `box-shadow` de tarjeta, sin fondo/superficie propia por bloque). La única superficie es la hoja; la única sombra montada es la de la **lámina**.
- Reintroducir **section-titles** por categoría, ni reagrupar la marginalia en una columna de widgets o un acordeón de secciones.
- Renderizar el recuerdo guardado con una **toolbar** de acciones visibles, ni el favorito como corazón toggle estándar.
- Poner una **acción destructiva** («Eliminar», botón rojo) sobre la hoja.
- Abrir **modales** para escribir el recuerdo, ni sacar al lector de la hoja para guardar.
- Imprimir el **índice al pie** de un capítulo, ni una barra de navegación persistente sobre la lectura.
- Mostrar **placeholders vacíos** de datos ausentes (si no hay tradición, no hay margen; si no hay foto autoral, no hay lámina forzada).
- Convertir el `<details>` práctico en una **card de "info"** siempre abierta.
- Añadir composiciones nuevas: son **cuatro**.

Prueba mental por cada bloque que renderice: *¿esto se lee como una página de libro o como un componente sostenido?* Si es lo segundo, está mal.

---

## 10. Criterios visuales verificables por captura

Cada criterio se comprueba con una captura del Día 1 renderizado (desktop y mobile, claro y oscuro):

1. **Continuidad:** al hacer scroll de llegada → cierre, no aparece ningún borde de card ni cambio de superficie; los cortes entre actividades son **siempre filetes**.
2. **Sin títulos de categoría:** en toda la hoja no se lee «Tradiciones», «Descubrimientos», «Lugares relacionados», «Recuerdos» ni «Nuestro momento».
3. **Marginalia al margen:** en desktop, las notas autoradas están en la columna lateral, no intercaladas como bloques a ancho completo.
4. **Escasez fotográfica:** contar láminas en el flujo del día ≤ 3; el resto no aparece en la hoja.
5. **Casilla estable:** comparar captura "durante" vs "guardado" del mismo beat — la casilla ocupa el **mismo lugar y tamaño**; solo cambia vacía→llena.
6. **Recuerdo sin toolbar:** el recuerdo guardado no muestra ninguna fila de botones; el favorito es lacre en esquina.
7. **Práctica plegada:** los datos de "cómo llegar/cruzar" están cerrados por defecto; solo abren al interactuar.
8. **Cuatro composiciones distinguibles:** una captura de cada beat deja ver el cambio de ritmo (pleno con lámina+margen / caminado ancho / pausa angosta centrada / umbral y cierre breves).
9. **Cierre correcto:** el día termina en una línea centrada + folio, **sin** índice de capítulos debajo.
10. **Ambos temas:** la misma hoja en claro y oscuro mantiene jerarquía, contraste y el acento (brass/cobalt/lacre) legibles.

---

## 11. Capacidades que deben sobrevivir (sección obligatoria)

**Esta transformación esconde la maquinaria; no la elimina.** Ninguna capacidad del producto se pierde. "Menos UI" **no** significa "menos producto": significa una aplicación más silenciosa, no más pobre.

De cada capacidad, lo único que cambia es **cuándo aparece**, **cómo aparece** y **cuánto protagonismo tiene**. Todas siguen existiendo y funcionando.

| Capacidad | Sigue existiendo | Dónde/cómo vive ahora |
|---|---|---|
| Fotografía de referencia del Story | Sí | Integrada al pasaje como lámina; no como banner ni card de cabecera. |
| Photo spot sugerido | Sí | Es **el espacio que espera** (lámina vacía + línea susurrada). |
| Subir múltiples fotografías por lugar | Sí | La primera se monta; las demás se guardan **detrás** (pila); el resto al álbum. |
| Galería completa del lugar | Sí | Existe, pero **no invade la lectura**: se abre al pedirla, no se despliega en el flujo. |
| Lightbox | Sí | Se invoca al tocar una lámina; visor a pantalla completa, igual que hoy. |
| Mapa | Sí | Aparece **al pedir "Cómo llegar"** (plegado), no como bloque siempre visible. |
| Navegación | Sí | Existe; se invoca. No como barra persistente sobre la lectura. |
| Cómo llegar | Sí | Dato práctico **plegado**; abre solo cuando se busca. |
| Tiempo estimado | Sí | Marginalia o dato plegado, según aporte; nunca chip de módulo. |
| Costos | Sí | **Marginalia** o información plegada; con `MoneyLine`. |
| MoneyLine | Sí | Intacto (ARS + conversión viva); se muestra donde vive el costo. Sin montos fabricados. |
| Presupuesto | Sí | Existe; **no rompe la narrativa**: se consulta, no se impone en la hoja. |
| Clima | Sí | Vive en **Companion**; habla solo cuando cambia una decisión. |
| Companion | Sí | Una sola mano cobalt por beat; habla solo cuando tiene algo valioso. |
| Favoritos | Sí | Se expresan como **sello (lacre)**; siguen siendo toggle accesible. |
| Edición | Sí | Existe; se invoca con el **gesto que se estira**, no como toolbar. |
| Eliminación | Sí | Existe como "**soltar**"; se invoca desde el susurro, nunca acción permanente sobre la hoja. |
| Compartir | Sí | Existe; se invoca; no ocupa chrome permanente en la lectura. |
| Álbum | Sí | Es el destino de todo lo que se prensa; intacto. La escasez del flujo **alimenta** el álbum. |
| Colecciones | Sí | Existen; viven como marginalia junto a su lugar o en su vista propia, no como sección titulada en el día. |
| Lugares relacionados | Sí | Sobreviven **cuando aportan contexto**: como pasaje corto o mención al margen. Lo que desaparece es la *lista* «Lugares relacionados», no la capacidad. |

**Regla para Codex:** si una capacidad de esta tabla deja de estar accesible, la implementación es incorrecta — aunque la hoja se vea más limpia. El criterio de éxito es doble: **se ve como un libro** *y* **hace todo lo que hacía la app**. Esconder ≠ borrar.

---

**Fin de la especificación.** Fiel al artefacto `alaia-dia-vivido.html`. Cualquier ambigüedad se resuelve mirando el artefacto, no inventando.
