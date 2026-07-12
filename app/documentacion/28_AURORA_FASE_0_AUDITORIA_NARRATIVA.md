# Aurora Etapa 2 — Fase 0: Auditoría Narrativa

**Estado:** documento de referencia para implementación  
**Fecha:** 2026-07-09  
**Alcance:** experiencia local actual de Buenos Aires 2026  
**Autoridad:** `docs/00_AURORA_CONSTITUTION.md` permanece como fuente superior  

Este documento describe cómo se vive Aurora hoy antes de comenzar la Fase 1 — Núcleo Narrativo de Capítulos.

No propone cambios de documentación oficial.

No implementa código.

Su propósito es servir como mapa de referencia para todas las decisiones de Etapa 2.

---

## 1. Veredicto ejecutivo

Aurora ya tiene una estructura emocional poderosa: portada, índice, preparativos, capítulos, epílogo, carta y álbum.

Pero la experiencia todavía alterna entre tres identidades:

```text
libro íntimo
  ↓
itinerario curado
  ↓
app de captura / checklist
  ↓
libro íntimo
```

El mayor problema narrativo actual no es visual ni técnico.

Es que el corazón emocional del día existe en el contenido (`ourMoment`), pero no aparece como momento central de lectura.

Eso hace que algunos capítulos se recuerden más por lugares y acciones que por cómo se sintieron.

---

## 2. Recorrido emocional completo actual

### 2.1 Portada / intro

| Elemento | Estado actual |
|---|---|
| Pantalla | Portada inicial / intro cinematográfica |
| Componentes | `renderCoverContent`, `renderIntroVideo`, `renderIntroIndexStage`, partículas, cuenta regresiva |
| Transición | Video o reveal según `coverIntroState`; con `prefers-reduced-motion` pasa a reveal estático |
| Tono emocional | Cinemático, íntimo, anticipatorio |
| Qué funciona | La experiencia arranca como libro/evento, no como app |
| Riesgo | El peso de video/assets puede hacer que la primera emoción llegue tarde |
| Constitución | Art. 5, Art. 9 |
| Prioridad | 🟠 Importante |

**Lectura emocional:**

Aurora abre bien. La primera impresión sostiene la promesa de libro interactivo. El riesgo no es conceptual sino de fluidez: si la carga o transición se siente pesada, el ritual se convierte en espera técnica.

---

### 2.2 Índice

| Elemento | Estado actual |
|---|---|
| Pantalla | Índice del viaje |
| Componentes | `renderIndexPage`, `renderJourneyIndex`, `renderChapterList`, `renderPreparationIndexEntry` |
| Transición | Scroll-snap vertical; escritura/reveal del índice durante intro |
| Tono emocional | Editorial, ordenado, ceremonial |
| Qué funciona | Capítulos con números romanos y fechas sostienen la metáfora de libro |
| Qué rompe | Preparativos aparece con progreso: “0 de 26 listos”, “Continuar →” |
| Constitución | Art. 3, Art. 10 |
| Prioridad | 🔴 Crítica |

**Lectura emocional:**

El índice quiere ser una tabla de contenidos. Pero el bloque de Preparativos introduce lenguaje de productividad. Es útil, sí, pero baja el tono de libro y sube el tono de app.

---

### 2.3 Preparativos

| Elemento | Estado actual |
|---|---|
| Pantalla | Preparativos antes del viaje |
| Componentes | `renderPreparationsPage`, `renderPreparationProgress`, `renderPreparationGroup`, `renderPreparationItem` |
| Transición | Reveal por grupos; progreso animado; toggle por ítem |
| Tono emocional | Antesala tranquila mezclada con checklist |
| Qué funciona | La introducción “Todo viaje empieza antes del avión” está alineada con Aurora |
| Qué rompe | Conteo, porcentajes implícitos, checks, categorías con `0/5`, `0/10`, etc. |
| Constitución | Art. 3, Art. 10, Art. 5 |
| Prioridad | 🔴 Crítica |

**Lectura emocional:**

Preparativos hoy funcionan como utilidad. Pero Aurora no puede sentirse como una app que mide si estamos listos. El contenido es correcto; la forma de progreso es la que rompe la atmósfera.

---

### 2.4 Capítulo disponible / apertura del día

| Elemento | Estado actual |
|---|---|
| Pantalla | Capítulo diario |
| Componentes | `renderInProgress`, `renderChapterHero`, `renderActivityCard` |
| Transición | `page-turn`, hero reveal, scroll vertical |
| Tono emocional | Fuerte apertura de libro |
| Qué funciona | Hero, fecha, título y copy de apertura tienen dirección narrativa clara |
| Qué rompe | La acción inicial dice “Marcar como iniciado” |
| Constitución | Art. 1, Art. 9 |
| Prioridad | 🔴 Crítica |

**Lectura emocional:**

El hero sostiene muy bien la sensación de capítulo. Pero el primer gesto de interacción devuelve al usuario al estado de sistema: iniciar/cerrar. En un libro, uno entra a un día; no lo marca como iniciado.

---

### 2.5 Actividades del capítulo

| Elemento | Estado actual |
|---|---|
| Pantalla | Lista narrativa de actividades |
| Componentes | `renderActivityCard`, `resolveChapterContent`, `renderLinks`, `renderActivityMemorySlot` |
| Transición | Reveal on scroll por actividad |
| Tono emocional | Mezcla entre guía curada e itinerario íntimo |
| Qué funciona | Muchas actividades tienen copy cálido, buenos detalles y fotografías |
| Qué rompe | La secuencia sigue leyéndose como lista larga de lugares, especialmente días 2 y 3 |
| Constitución | Art. 1, Art. 6, Art. 7 |
| Prioridad | 🔴 Crítica |

**Lectura emocional:**

Los capítulos tienen material narrativo suficiente. El problema es ritmo y jerarquía: las actividades se acumulan antes de que Aurora haga pausas emocionales. El usuario puede recordar “qué hicieron” antes que “qué quedó”.

---

### 2.6 Recuerdos dentro de actividades

| Elemento | Estado actual |
|---|---|
| Pantalla | Invitaciones a guardar recuerdos |
| Componentes | `renderMemoryInvitation`, `renderPhotoStaging`, `renderSavedMemory` |
| Transición | Aparece dentro de cada card; fotos staged con miniaturas |
| Tono emocional | Intención íntima con lenguaje de app |
| Qué funciona | La invitación es opcional y no aparece como obligación |
| Qué rompe | “+ Agregar fotos”, “Guardar este recuerdo”, “Hacer principal”, “Quitar”, “Marcar como favorito” |
| Constitución | Art. 2, Art. 7, Art. 9, Art. 11 |
| Prioridad | 🔴 Crítica |

**Lectura emocional:**

El gesto de guardar algo es central para Aurora. Hoy todavía se parece demasiado a subir/gestionar contenido. La Constitución dice que Aurora conserva momentos, no archivos; el microcopy actual todavía habla con voz de sistema.

---

### 2.7 “Algo más de hoy”

| Elemento | Estado actual |
|---|---|
| Pantalla | Bloque de memoria general del capítulo |
| Componentes | `renderGeneralMemories` |
| Transición | Reveal después del álbum de capítulo |
| Tono emocional | Correcto pero débil |
| Qué funciona | Permite recuerdos espontáneos sin atarlos a una actividad |
| Qué rompe | “Algo más de hoy” suena residual, como apéndice |
| Constitución | Art. 2, Art. 6 |
| Prioridad | 🔴 Crítica |

**Lectura emocional:**

Este bloque debería legitimar lo no planificado. Hoy lo trata como “algo más”, cuando para Aurora los momentos espontáneos pueden ser lo más importante.

---

### 2.8 `ourMoment` no renderizado

| Elemento | Estado actual |
|---|---|
| Pantalla | Capítulos diarios |
| Componente | Datos en `story-ba2026.json`, sin render visible específico |
| Transición | No existe |
| Tono emocional | Ausente en interfaz |
| Qué funciona | El contenido escrito es muy fuerte en los 4 días |
| Qué rompe | El núcleo emocional del día queda fuera del recorrido |
| Constitución | Art. 1, Art. 2, Art. 6 |
| Prioridad | 🔴 Crítica máxima |

**Lectura emocional:**

Este es el hallazgo principal de la Fase 0.

Aurora ya sabe cuál es “nuestro momento” de cada día, pero no lo pone en escena.

Mientras eso no ocurra, el capítulo depende demasiado de actividades, fotos y notas. La experiencia puede ser hermosa, pero no termina de convertirse en memoria.

---

### 2.9 Night note / cierre del día

| Elemento | Estado actual |
|---|---|
| Pantalla | Final del capítulo |
| Componentes | `renderNightNote`, `renderActionButton` |
| Transición | Aparece después de recuerdos generales |
| Tono emocional | Bueno, íntimo, calmo |
| Qué funciona | El contenido de `nightNote` respeta el ritmo y evita ansiedad |
| Qué rompe | Queda después de bloques funcionales; el botón “Cerrar capítulo” corta la poesía |
| Constitución | Art. 5, Art. 9 |
| Prioridad | 🟠 Importante |

**Lectura emocional:**

La nota nocturna funciona, pero su efecto se diluye porque llega después de varios componentes de memoria/álbum. El cierre debería sentirse como bajar la voz, no como terminar un formulario.

---

### 2.10 Hueco entre días

| Elemento | Estado actual |
|---|---|
| Pantalla | Día cerrado, próximo día aún bloqueado |
| Componentes | `renderClosingMessage`, índice |
| Transición | Página de cierre + índice |
| Tono emocional | Contemplativo |
| Qué funciona | No revela el día siguiente y evita vacío |
| Qué rompe | Falta una conexión más clara de “pasar página” |
| Constitución | Art. 5 |
| Prioridad | 🟡 Mejora |

**Lectura emocional:**

Este flujo respeta muy bien el tiempo. No es urgente. No presiona. Solo necesita pulido de ritmo si luego el capítulo se reordena.

---

### 2.11 Epílogo

| Elemento | Estado actual |
|---|---|
| Pantalla | Feliz cumpleaños |
| Componentes | `renderEpilogue`, `renderPromptSlot` |
| Transición | Reading topbar + prompts |
| Tono emocional | Íntimo, retrospectivo |
| Qué funciona | La premisa “no hay respuesta correcta” es muy Aurora |
| Qué rompe | Prompts vuelven a lenguaje de formulario: guardar, elegir, fallback “Por ahora...” |
| Constitución | Art. 2, Art. 4, Art. 9 |
| Prioridad | 🟠 Importante |

**Lectura emocional:**

El epílogo quiere ser una página escrita juntos. Pero algunas interacciones todavía parecen encuesta o formulario. La intención es correcta; la interfaz necesita bajar más la voz.

---

### 2.12 Carta final / Memory Mode

| Elemento | Estado actual |
|---|---|
| Pantalla | Carta final |
| Componentes | `renderMemoryMode`, `finalLetter` |
| Transición | Aparece luego de completar epílogo; opcionalmente “Esta historia se convirtió en un recuerdo.” |
| Tono emocional | Muy fuerte, honesto, alineado |
| Qué funciona | Es una de las partes más terminadas de Aurora |
| Qué rompe | La entrada al álbum después de la carta vuelve a lenguaje funcional |
| Constitución | Art. 1, Art. 5, Art. 6 |
| Prioridad | 🟠 Importante |

**Lectura emocional:**

La carta final funciona. No es el problema. Lo que falta es que todo lo anterior la haga inevitable y que lo posterior no la reduzca a “ver álbum”.

---

### 2.13 Álbum

| Elemento | Estado actual |
|---|---|
| Pantalla | Álbum del viaje |
| Componentes | `renderTripAlbum`, `renderMemoryCard` |
| Transición | Página propia + índice de retorno |
| Tono emocional | Recuerdo agrupado, pero todavía galería |
| Qué funciona | Agrupa por capítulo y oculta ausencias |
| Qué rompe | “Tu álbum del viaje”, cards agrupadas, empty state “El álbum espera sus primeros recuerdos” |
| Constitución | Art. 2, Art. 6, Art. 9 |
| Prioridad | 🟠 Importante |

**Lectura emocional:**

El álbum todavía no dice “esto fue nuestro Buenos Aires”. Dice “acá están tus recuerdos”. Es correcto, pero no definitivo.

---

### 2.14 Instalación y notificaciones

| Elemento | Estado actual |
|---|---|
| Pantalla | Banners y permisos |
| Componentes | `renderInstallBanner`, `renderNotificationPrompt`, `resolveInstallBanner`, `resolveNotificationState` |
| Transición | Banner flotante con fade/dismiss |
| Tono emocional | Utilitario discreto |
| Qué funciona | No aparece en Preparativos y no invade escenarios dev |
| Qué rompe | Instalar puede pedir permiso de notificación como efecto secundario |
| Constitución | Art. 3, Art. 7 |
| Prioridad | 🟠 Importante |

**Lectura emocional:**

Aurora no debería pedir más de lo que el usuario entiende. Si instalar y notificar se mezclan, se pierde confianza emocional.

---

### 2.15 Modo Día/Noche

| Elemento | Estado actual |
|---|---|
| Pantalla | Capítulos, epílogo, memoria, álbum, preparativos |
| Componentes | `renderThemeSwitch`, tokens CSS, `applyThemePreferenceInPlace` |
| Transición | Cambio en lugar, sin rerender fuerte |
| Tono emocional | Correcto: iluminación, no app distinta |
| Qué funciona | Ya se corrigió para afectar fondos/superficies sin reiniciar portada |
| Qué rompe | Requiere QA visual para asegurar misma identidad en todas las secciones |
| Constitución | Art. 9 |
| Prioridad | 🟡 Mejora |

**Lectura emocional:**

El modo Día/Noche está cerca de estar terminado. Debe mantenerse como iluminación, no como modo visual separado.

---

### 2.16 Animaciones y scroll

| Elemento | Estado actual |
|---|---|
| Pantalla | Toda la experiencia |
| Componentes | `page-turn`, scroll-snap, reveals, partículas, intro video, locked modal |
| Transición | Varias capas de animación y snap obligatorio |
| Tono emocional | Cinemático, a veces riesgoso |
| Qué funciona | Da sensación de libro diseñado |
| Qué rompe | Si se percibe demasiado, Aurora se luce a sí misma |
| Constitución | Art. 9 |
| Prioridad | 🟠 Importante |

**Lectura emocional:**

La animación debe acompañar el recuerdo. En general está alineada, pero la cantidad de efectos exige una pasada final para evitar teatralidad excesiva.

---

### 2.17 Director Mode

| Elemento | Estado actual |
|---|---|
| Pantalla | Panel QA con escenarios |
| Componentes | `directorMode.js`, `DIRECTOR_STAGES`, panel flotante |
| Transición | Navega por fechas/progreso simulados |
| Tono emocional | Técnico |
| Qué funciona | Muy útil para QA y demos |
| Qué rompe | El panel todavía habla como herramienta interna |
| Constitución | Art. 9, coherencia de Etapa 2 |
| Prioridad | 🟡 Mejora |

**Lectura emocional:**

Director Mode debe existir para QA, pero no contaminar la experiencia real. Está bien aislado, aunque todavía no está pulido para presentaciones premium.

---

## 3. Momentos donde Aurora deja de sentirse libro

| Prioridad | Pantalla | Componente | Qué rompe | Principio afectado |
|---|---|---|---|---|
| 🔴 | Capítulos | `ourMoment` ausente del render | El día no tiene centro emocional explícito | Art. 1, 2, 6 |
| 🔴 | Preparativos | `renderPreparationProgress` | Mide el viaje como checklist | Art. 3, 10 |
| 🔴 | Capítulo | `renderActionButton` | “Marcar como iniciado” / “Cerrar capítulo” suena a sistema | Art. 9 |
| 🔴 | Recuerdos | `renderPhotoStaging` | “Agregar fotos”, “Quitar”, “Hacer principal” trata momentos como archivos | Art. 2, 7 |
| 🔴 | Recuerdos | `renderMemoryInvitation` | “Guardar este recuerdo” suena a acción de app | Art. 2, 9 |
| 🔴 | Recuerdo espontáneo | `renderGeneralMemories` | “Algo más de hoy” vuelve residual lo espontáneo | Art. 2, 6 |
| 🟠 | Epílogo | `renderPromptSlot` | Prompts se sienten como formulario | Art. 4, 9 |
| 🟠 | Álbum | `renderTripAlbum` | Se siente galería agrupada, no cierre emocional | Art. 2, 6 |
| 🟠 | Instalación | `install-app` | Puede pedir notificaciones al instalar | Art. 3, 7 |
| 🟠 | Animaciones | CSS global | Riesgo de que la interfaz se luzca más que el recuerdo | Art. 9 |
| 🟡 | Director Mode | `renderDirectorPanel` | Panel técnico, no presentación premium | Art. 9 |
| 🟡 | Accesibilidad | imágenes con `alt=""` | Algunos recuerdos quedan mudos | Art. 9 |

---

## 4. Journey Map emocional actual

| Etapa | Qué siente hoy | Riesgo emocional | Estado |
|---|---|---|---|
| Primera apertura | “Esto es especial” | Carga pesada puede retrasar magia | 🟠 Casi listo |
| Índice | “Esto es un libro” | Preparativos introduce progreso | 🟠 Bueno con quiebre |
| Preparativos | “Nos estamos preparando” | Checklist/productividad | 🔴 Necesita Fase 2 |
| Apertura de capítulo | “Empieza el día” | Acción administrativa | 🔴 Necesita Fase 1 |
| Actividades | “Hay una guía cuidada” | Lista larga de lugares | 🔴 Necesita Fase 1 |
| Guardar recuerdo | “Podría dejar algo acá” | Lenguaje de archivos/app | 🔴 Necesita Fase 3/4 |
| Cierre del día | “El día baja la voz” | Botón de cierre corta atmósfera | 🟠 Ajustar |
| Entre días | “Aurora espera” | Pequeña falta de transición editorial | 🟡 Bien |
| Epílogo | “Estamos mirando hacia atrás” | Formulario/selección | 🟠 Ajustar |
| Carta final | “Esto importó” | Necesita que el viaje la sostenga mejor | 🟠 Muy cerca |
| Álbum | “Acá están los recuerdos” | Falta cierre “esto fuimos nosotros” | 🟠 Ajustar |
| Director Mode | “Puedo revisar todo” | Herramienta técnica visible | 🟡 Mejorar después |

---

## 5. Conclusión de Fase 0

La experiencia actual de Aurora ya tiene una identidad fuerte, pero todavía no es completamente una historia.

Tiene los ingredientes:

- portada;
- índice;
- capítulos;
- memorias;
- epílogo;
- carta;
- álbum;
- tono visual;
- estructura técnica sólida.

Pero el recorrido todavía necesita una decisión editorial clara:

> El centro de cada día no debe ser lo que se hizo.  
> Debe ser lo que quedó.

Por eso la Fase 1 debe comenzar con el núcleo narrativo de capítulos.

No con performance.

No con responsive.

No con microinteracciones.

Primero hay que devolverle al día su centro emocional.

---

## 6. Referencia para Fase 1

La Fase 1 debe enfocarse en:

1. Integrar `ourMoment` en cada capítulo.
2. Reordenar el cierre emocional del día.
3. Revisar el lugar de `nightNote`.
4. Cambiar acciones de estado por lenguaje editorial.
5. Reducir sensación de lista en días largos.

Nada de esto debe agregar funcionalidades grandes.

Debe hacer que lo que ya existe se lea mejor.

---

## 7. Parking Lot detectado durante Fase 0

Estas ideas no deben implementarse durante Fase 1:

- Timeline global.
- Album Engine nuevo.
- Revivir como modo guiado nuevo.
- Backend o Aurora Cloud.
- Sincronización nueva.
- Usuarios o historia compartida.
- Videos de usuario.
- Reestructuración completa del Memory Engine.
- Reescritura de Story Engine.

---

## 8. Criterio de cierre de Fase 0

Fase 0 queda completa cuando este documento puede responder:

- cómo se recorre Aurora hoy;
- dónde cambia el tono emocional;
- dónde vuelve a sentirse aplicación;
- qué principios de la Constitución se ven afectados;
- qué debe guiar la Fase 1.

Con esta auditoría, Aurora está lista para comenzar Fase 1 — Núcleo Narrativo de Capítulos, sin perder el foco de Etapa 2.
