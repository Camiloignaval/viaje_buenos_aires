# Aurora como biblioteca de recuerdos

Este documento audita el estado actual de Aurora y propone su evolución como producto emocional. No define una implementación inmediata: separa qué existe, qué falta, qué conviene cambiar, qué riesgos hay y cómo avanzar por etapas sin romper Story Engine, JSON, capítulos, desbloqueos, Director Mode, Preparativos, PWA, memorias actuales ni tests.

## Decisión central

Aurora no debe crecer como una app de viajes. Debe crecer como una biblioteca de recuerdos:

- cada viaje es un libro;
- cada día es un capítulo;
- cada actividad, foto, video, nota o audio es parte de la misma historia;
- durante el viaje Aurora acompaña;
- después del viaje Aurora recuerda;
- años después Aurora permite volver a vivirlo.

La arquitectura correcta no es “agregar más galerías”. Es construir una línea narrativa única donde lo planificado y lo vivido convivan sin competir.

## 1. Auditoría actual

| Área | Estado actual | Evidencia |
|---|---|---|
| Story Package | Existe un JSON central `story-ba-2026`, schema `1.4`, con metadata, fechas, capítulos, actividades, recuerdos sugeridos, checklist y epílogo. | `app/src/story/data/story-ba2026.json` |
| Fechas del viaje | `travelDates.start = 2026-07-18`, `travelDates.end = 2026-07-21`. No existe `timezone`. | `metadata.travelDates` |
| Capítulos | Hay 4 capítulos principales. La fecha de cada capítulo se deriva de `travelDates.start + order - 1` salvo que el capítulo tenga `date`. | `storyProgress.js#getChapterReferenceDate` |
| Epílogo | Existe como `specialChapter`, con `date: 2026-07-22`, `kind: epilogue`, y prompts retrospectivos. | `story-ba2026.json` |
| Story Engine | Ya separa modos `pre_trip`, `in_progress`, `epilogue`, `memory_mode`. | `storyEngine.js` |
| Progreso | Vive en `localStorage` bajo `aurora:progress:<storyId>`. | `progressStore.js` |
| Memorias Aurora | Metadata en `localStorage` bajo `aurora:memories:<storyId>`. Fotos reales en IndexedDB `aurora-photos`. | `memoryStore.js`, `photoStore.js` |
| Modelo de memoria actual | Una memoria tiene `id`, `storyId`, `chapterId`, `activityId`, `note`, `photos`, `videos: []`, `favorite`, `archived`, `createdAt`, `updatedAt`. | `memoryStore.js` |
| Fotos | Se guardan como Blob en IndexedDB; en sync pueden promoverse a URL remota de Cloudinary. | `photoStore.js`, `syncClient.js` |
| Videos | En Aurora nueva están reservados pero no implementados. En el prototipo legacy hay subida de video por Cloudinary. | `memoryStore.js`, `storage.js` |
| Recuerdos sugeridos | Existen en el JSON como `suggestedMemories`, ligados opcionalmente a `relatedActivityId`. Presentation los muestra como hints dentro de la actividad. | `chapterContent.js`, `render.js` |
| Recuerdos espontáneos | Existen parcialmente: el bloque “Algo más de hoy” permite nota/fotos sin actividad. Falta nombrarlo y modelarlo como espontáneo real. | `renderGeneralMemories` |
| Álbum | Existe “Tu álbum del viaje”, agrupado por capítulo y ordenado por `createdAt`. No mezcla actividades sin memoria ni funciona todavía como timeline completo. | `renderTripAlbum` |
| Preparativos | Existe checklist de 47 ítems, pero usa el storage legacy `ba-trip-memories`, no el Memory Engine nuevo. | `experienceView.js`, `storage.js` |
| PWA | Existe manifest, service worker y flujo de instalación solo para `experience.html`. | `vite.config.js`, `experienceView.js` |
| Notificaciones | Existe una versión mínima: se evalúa al abrir/volver a primer plano; no hay push real ni programación local. | `notifications.js`, `experienceView.js` |
| Sync | Existe sync real opcional con MongoDB + Cloudinary por `storyId` + `accessToken`. Es por historia, no por usuario. | `syncClient.js`, `api/aurora/sync.js` |
| Backend | Hay dos mundos: backend legacy `/api/memories` y backend Aurora `/api/aurora/*`. | `api/memories*.js`, `api/aurora/*.js` |
| Multiusuario | No existe identidad real de usuario ni membresía de viaje. Hay sincronización multi-dispositivo por token compartido. | `syncClient.js`, `api/aurora/sync.js` |
| Director Mode | Existe como QA con fechas simuladas y recorrido automático; usa overrides de `now` y progreso. | `directorMode.js`, `experienceView.js` |

## 2. Qué ya existe y conviene conservar

### Base sólida

Aurora ya tiene una base bastante mejor que “una app linda”. Hay separación real:

- `storyPackage` valida el contrato mínimo.
- `storyProgress` calcula desbloqueos de forma pura.
- `storyEngine` decide el modo narrativo.
- `render` pinta sin tocar storage.
- `experienceView` orquesta DOM, storage, fotos, notificaciones, PWA y sync.
- `memoryStore` no conoce Story Engine.
- `syncMerge` es función pura compartida cliente/servidor.

Esto es importante: NO hay que reescribir Aurora. Hay que extenderla con cabeza.

### Conceptos que ya están cerca de la visión

| Visión nueva | Ya existe como |
|---|---|
| Cada viaje es una historia | `StoryPackage` con `storyId` |
| Cada día es un capítulo | `chapters[]` |
| Capítulos bloqueados por fecha | `storyProgress` |
| Preparativos antes del viaje | `checklist` + vista Preparativos |
| Recuerdos sugeridos | `suggestedMemories[]` |
| Recuerdos espontáneos | “Algo más de hoy” sin `activityId` |
| Álbum final | `renderTripAlbum` |
| Epílogo | `specialChapter` |
| Modo recuerdo | `memory_mode` |
| Persistencia offline | localStorage + IndexedDB |
| Sync opcional | `/api/aurora/sync` |

## 3. Qué falta

### Falta de producto

1. **Timeline del día**: hoy hay listas editoriales por secciones; no una cronología unificada.
2. **Diferencia explícita entre sugerido y espontáneo**: hoy ambos terminan como `Memory`, sin `origin`.
3. **Captura temporal real**: `createdAt` existe, pero no `capturedAt`.
4. **Interludios**: no existe entidad entre Preparativos/Capítulo I ni Capítulo IV/Epílogo.
5. **Álbum como historia**: hoy el álbum muestra recuerdos guardados; no reconstruye el día con actividades + memorias.
6. **Revivir el viaje**: `memory_mode` existe, pero no como recorrido guiado.
7. **Desbloqueo emocional post-regreso**: memory mode aparece apenas se completa el epílogo; no espera 7 días.
8. **Notificaciones editoriales por agenda**: existe solo “significant notification” al abrir la app.
9. **Multiusuario real**: no hay `User`, `TripMember`, autoría por recuerdo ni permisos.

### Falta técnica

1. **Fuente temporal única completa**: hay `travelDates`, pero falta `timezone`.
2. **Contrato de eventos narrativos**: no hay `TimelineEvent`.
3. **Modelo de media separado**: `photos[]` guarda ids/URLs directos dentro de `Memory`; alcanza ahora, pero queda corto para audio/video/sync.
4. **Identidad de dispositivo**: no existe `deviceId`.
5. **Identidad de usuario**: no existe `uploadedBy`.
6. **Estados de sync por asset**: no hay `syncStatus` granular.
7. **Migración de Preparativos**: todavía depende del storage legacy.
8. **Conflictos multiusuario**: `mergeMemories` resuelve por última actualización de memoria completa; no por campo ni por asset.

## 4. Diagnóstico técnico

### Lo más importante

Aurora ya tiene el corazón correcto: Story Package + Story Engine + Memory Engine. El problema es que el modelo de recuerdos todavía representa “cosas guardadas”, no “eventos de una historia”.

Eso es normal para la etapa actual, pero si seguimos agregando features encima de `Memory` tal como está, vamos a terminar con una galería disfrazada. Y NO: ahí hay que frenar, porque estaríamos programando contra el síntoma y no contra el concepto.

El siguiente salto debe ser conceptual:

> de `Memory` como tarjeta aislada  
> a `TimelineEvent` como unidad narrativa del viaje.

### Fechas y zona horaria

Estado actual:

- Countdown usa `view.nextUnlock.date` y `now`.
- `now` viene de `new Date()` salvo Director Mode o `?scenario`.
- Capítulos usan `travelDates.start + order - 1`.
- Epílogo usa su propio `specialChapter.date`.
- Las comparaciones se hacen con UTC (`getUTCDate`, `setUTCDate`).
- No hay `timezone`.
- Si el usuario cambia la hora del dispositivo, Aurora le cree al dispositivo.

Riesgo:

Para una app emocional, abrir un capítulo antes o después por zona horaria se siente roto. No es un bug menor: rompe el ritual.

Recomendación:

```json
{
  "trip": {
    "id": "trip-ba-2026",
    "storyId": "story-ba-2026",
    "startDate": "2026-07-18",
    "endDate": "2026-07-21",
    "timezone": "America/Santiago",
    "revisitUnlockDaysAfterEnd": 7
  }
}
```

En el estado actual puede vivir dentro de `metadata.travelDates` sin romper schema:

```json
"travelDates": {
  "start": "2026-07-18",
  "end": "2026-07-21",
  "timezone": "America/Santiago"
}
```

Pero a mediano plazo conviene separar `Trip` de `StoryPackage`: el Story Package describe la historia; el Trip representa esta instancia vivida por personas concretas.

## 5. Propuesta de arquitectura

### Arquitectura objetivo

```text
Story Package
  define contenido narrativo esperado
        ↓
Trip
  define instancia real: fechas, timezone, miembros, estado
        ↓
Timeline Engine
  mezcla actividades + recuerdos + interludios + epílogo
        ↓
Experience Renderer
  muestra capítulo, álbum o revivir según modo
```

### Nueva pieza: Timeline Engine

El Timeline Engine debe ser función pura:

```text
StoryPackage + Trip + Memories + Progress + now → TimelineDay[]
```

No guarda nada. No sube fotos. No notifica. Solo ordena y decide cómo se interpreta el viaje vivido.

Debe producir eventos como:

- actividad planeada;
- recuerdo sugerido pendiente;
- recuerdo sugerido completado;
- recuerdo espontáneo;
- nota;
- foto;
- video futuro;
- audio futuro;
- interludio;
- cierre del día;
- epílogo;
- carta;
- álbum final.

### Regla conceptual

No debe haber “fotos sugeridas” por un lado y “fotos libres” por otro en la experiencia final.

En storage pueden tener `origin`, porque técnicamente importa. En UI deben integrarse como historia.

## 6. Modelos sugeridos

### Trip

```ts
type Trip = {
  id: string;
  storyId: string;
  title: string;
  startDate: string;
  endDate: string;
  timezone: string;
  revisitUnlockDaysAfterEnd: number;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

### User y TripMember

```ts
type User = {
  id: string;
  displayName: string;
  createdAt: string;
};

type TripMember = {
  tripId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
};
```

Para ahora puede existir solo como metadata opcional. No hay que construir login todavía.

### Memory

```ts
type Memory = {
  id: string;
  tripId: string;
  storyId: string;
  chapterId?: string | null;
  activityId?: string | null;
  interludeId?: string | null;
  suggestedMemoryId?: string | null;
  origin: 'suggested' | 'spontaneous' | 'epilogue' | 'preparation';
  kind: 'memory';
  note?: string;
  assetIds: string[];
  favorite: boolean;
  archived: boolean;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: string | null;
  deviceId?: string | null;
  visibility: 'trip';
  syncStatus: 'local' | 'syncing' | 'synced' | 'failed';
};
```

### MemoryAsset

```ts
type MemoryAsset = {
  id: string;
  memoryId: string;
  tripId: string;
  type: 'photo' | 'video' | 'audio';
  localBlobRef?: string;
  remoteUrl?: string;
  cloudinaryPublicId?: string;
  capturedAt?: string;
  uploadedAt?: string;
  uploadedBy?: string | null;
  deviceId?: string | null;
  syncStatus: 'local' | 'syncing' | 'synced' | 'failed';
};
```

### Interlude

```ts
type Interlude = {
  id: string;
  tripId: string;
  position: 'before_first_chapter' | 'after_last_chapter';
  title: string;
  date: string;
  order: number;
  copy: {
    open: string;
    transition?: string;
  };
  suggestedMemorySlots: SuggestedMemory[];
};
```

### TimelineEvent

```ts
type TimelineEvent = {
  id: string;
  tripId: string;
  dayId: string;
  chapterId?: string | null;
  interludeId?: string | null;
  activityId?: string | null;
  memoryId?: string | null;
  suggestedMemoryId?: string | null;
  type:
    | 'activity'
    | 'suggested_memory_pending'
    | 'suggested_memory_completed'
    | 'spontaneous_memory'
    | 'interlude'
    | 'epilogue_prompt'
    | 'day_closing';
  occurredAt: string;
  sortKey: string;
  title: string;
  body?: string;
};
```

Importante: `TimelineEvent` no tiene por qué persistirse al principio. Puede derivarse. Persistirlo demasiado pronto sería sobreingeniería.

## 7. Recuerdos sugeridos vs espontáneos

### Recomendación

Durante el viaje:

- los recuerdos sugeridos incompletos deben seguir apareciendo como momentos esperados;
- si se completan, se integran al timeline;
- si no se completan, no deben ensuciar el álbum final.

Después del viaje:

- en modo “Explorar”, pueden quedar sutilmente como “momentos que Aurora imaginó” si aporta emoción;
- en modo “Revivir”, NO deberían aparecer como pendientes. Lo vivido reemplaza a lo sugerido.

Motivo:

Un recuerdo no registrado puede ser poético una vez. Pero si aparece demasiado, se vuelve reproche. Y Aurora no reprocha.

## 8. Interludios

### Rumbo a Buenos Aires

Debe vivir entre Preparativos y Capítulo I. No debe ser capítulo principal.

Propuesta de tono:

> Todavía no llegamos, pero el viaje ya empezó. En algún punto entre el aeropuerto, las nubes y esa ansiedad linda de mirar por la ventana, Buenos Aires dejó de ser un destino y empezó a convertirse en una historia.

Transición:

> Ahora sí. Comienza el Capítulo I.

### De vuelta a casa

Debe vivir entre Capítulo IV y Epílogo. No debe ser capítulo principal.

Propuesta de tono:

> Hay ciudades que uno visita y ciudades que vuelven con uno. Buenos Aires ya no está debajo del avión, pero va a seguir apareciendo en canciones, conversaciones y fotos que todavía no sabemos cuánto van a significar.

Transición:

> Antes de cerrar Aurora, queda una última página por escribir.

## 9. Notificaciones

Estado actual:

- No hay push real.
- No hay programación local confiable.
- Aurora evalúa eventos significativos cuando la app está abierta.
- Ya cumple una regla importante: no pide permiso al primer inicio sin contexto.

Recomendación:

### Ahora

Mantener notificaciones locales oportunistas:

- al abrir Aurora;
- al volver a primer plano;
- máximo una por día;
- solo si hay motivo narrativo.

### Después

Diseñar `NotificationSchedule` derivado de `Trip + Timeline`:

```ts
type NotificationSchedule = {
  id: string;
  tripId: string;
  deviceId: string;
  triggerAt: string;
  timezone: string;
  type: 'pre_trip' | 'chapter_open' | 'memory_prompt' | 'day_close' | 'revisit_unlock';
  title: string;
  body: string;
  status: 'pending' | 'sent' | 'dismissed' | 'unsupported';
};
```

Fallback honesto:

- si no hay soporte de programación/push, Aurora no promete alarmas;
- muestra recordatorios dentro de la app;
- puede apoyarse en backend futuro si se decide implementar Web Push.

## 10. Multiusuario

Estado actual:

Hay sincronización por `storyId` + `accessToken`. Eso permite más de un dispositivo, pero no identifica personas.

No existe:

- `User`;
- `TripMember`;
- `uploadedBy`;
- `deviceId`;
- permisos por miembro;
- auditoría de quién subió qué;
- invitaciones.

Recomendación:

No implementar multiusuario completo ahora. Preparar los modelos para no bloquearlo:

1. agregar `tripId` como concepto futuro;
2. agregar `deviceId` local anónimo;
3. permitir `uploadedBy: null` por ahora;
4. no separar álbumes por usuario;
5. sincronizar como viaje compartido;
6. dejar login/invitaciones para etapa 6.

## 11. Modo “Revivir el viaje”

Estado actual:

`memory_mode` existe, pero es una pantalla final con carta + acceso al álbum. No es recorrido guiado.

Propuesta:

Separar dos formas post-viaje:

### Explorar

Libro abierto. El usuario entra libremente a capítulos, álbum, recuerdos, carta, epílogo.

### Revivir

Recorrido guiado. No slideshow. No video. No autoplay tonto.

Debe usar el Timeline Engine para reconstruir:

```text
Intro
Preparativos
Rumbo a Buenos Aires
Capítulo I
Eventos reales del día
Nuestro momento
Capítulo II
Capítulo III
Capítulo IV
De vuelta a casa
Epílogo
Carta
Álbum completo
```

Regla:

Las sugerencias incompletas desaparecen o pasan a nota secundaria. Las fotos, notas y videos reales toman el lugar narrativo.

### Desbloqueo

No debe aparecer inmediatamente. Recomendación: 7 días después de `trip.endDate`.

Mensaje:

> Algunas historias necesitan tiempo antes de volver a abrirse.

Luego:

> ✨ Revivir el viaje

## 12. Riesgos técnicos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Agregar timeline directamente en `render.js` | Presentation empieza a decidir dominio. | Crear `timelineEngine.js` puro. |
| Convertir `Memory` en megaobjeto | Se vuelve rígido para video/audio/multiusuario. | Separar `Memory` y `MemoryAsset` gradualmente. |
| Meter interludios como capítulos falsos | Rompe desbloqueos, numeración y Director Mode. | Crear entidad `Interlude` o `storyPackage.interludes`. |
| No agregar timezone | Capítulos/notificaciones pueden abrir mal. | Incorporar `timezone` en fuente de verdad temporal. |
| Multiusuario sin identidad | No se sabe quién subió qué. | Agregar `deviceId` ahora, `User` después. |
| Preparativos en storage legacy | Dos sistemas de memoria conviven. | Migrar Preparativos al namespace Aurora en etapa segura. |
| Notificaciones prometidas sin soporte real | Producto pierde confianza. | Ser honesto: fallback in-app hasta tener push backend. |
| Sync por última memoria completa | Un cambio puede pisar otro en edición concurrente. | Aceptable ahora; revisar en multiusuario real. |
| “Revivir” como slideshow | Traiciona la visión. | Basarlo en timeline narrativo, no en media. |

## 13. Plan por etapas

### Etapa 1 — Mínimo viable ahora

Objetivo: ordenar fundamentos sin cambiar la experiencia visible fuerte.

- Documentar fuente temporal objetivo.
- Agregar `timezone` al contrato del viaje.
- Definir `tripId` aunque todavía sea fijo.
- Renombrar conceptualmente “Algo más de hoy” a “Lo que este día también nos regaló”.
- Mantener recuerdos actuales.
- No tocar sync complejo.
- No tocar multiusuario real.

Resultado esperado:

Aurora sigue igual para el usuario, pero el próximo crecimiento ya no empuja hacia galería.

### Etapa 2 — Timeline local por día

Objetivo: derivar una cronología sin cambiar storage todavía.

- Crear `timelineEngine`.
- Mezclar actividades + memorias por `activityId` + memorias generales.
- Ordenar por hora de actividad y `createdAt` temporalmente.
- Preparar `capturedAt` para memoria nueva.
- Mostrar timeline como vista interna o reemplazo gradual del álbum por capítulo.

Resultado:

Cada día empieza a poder recorrerse como ocurrió.

### Etapa 3 — Recuerdos espontáneos

Objetivo: hacer explícita la captura libre.

- Cambiar el bloque final a “Lo que este día también nos regaló”.
- Guardar `origin: spontaneous`.
- Guardar `capturedAt`.
- Preparar `assetIds` sin romper `photos[]` actual.
- Mantener compatibilidad con memorias antiguas.

Resultado:

Aurora deja de tratar lo libre como “algo más” y lo vuelve parte legítima de la historia.

### Etapa 4 — Interludios avión ida/regreso

Objetivo: sumar antesala y despedida sin romper capítulos.

- Agregar `interludes` al Story Package.
- Renderizar “Rumbo a Buenos Aires” antes de Capítulo I.
- Renderizar “De vuelta a casa” antes del Epílogo.
- Permitir memorias asociadas a `interludeId`.
- Ajustar Director Mode para incluir ambas etapas.

Resultado:

El viaje empieza en el avión y termina emocionalmente en el regreso.

### Etapa 5 — Notificaciones

Objetivo: pasar de notificación mínima a sistema editorial prudente.

- Extender `resolveSignificantNotification`.
- Derivar eventos pre-viaje: 7, 3, 1 días y mañana del viaje.
- Derivar eventos durante viaje: apertura de capítulo, cierre del día, momentos relevantes.
- Mantener máximo 1 por día al principio aunque la visión permita 2–3.
- Persistir `dismissed`/`sent` por device.

Resultado:

Aurora acompaña sin convertirse en app de productividad.

### Etapa 6 — Multiusuario/sync

Objetivo: convertir viaje compartido en modelo real.

- Introducir `Trip`, `User`, `TripMember`.
- Agregar `uploadedBy` y `deviceId`.
- Ajustar backend para `tripState`, no solo `storyState`.
- Revisar merge por asset/campo.
- Implementar invitación por token de viaje.

Resultado:

Camilo y Kari comparten un viaje. No dos álbumes.

### Etapa 7 — Modo Revivir el viaje

Objetivo: reconstrucción emocional completa.

- Agregar `revisitUnlockAt = endDate + 7 días`.
- Separar “Explorar” y “Revivir”.
- Usar Timeline Engine para recorrido guiado.
- Sustituir sugerencias por recuerdos reales.
- Incluir intro, preparativos, interludios, capítulos, epílogo, carta y álbum.

Resultado:

Aurora deja de ser “lo que usamos en Buenos Aires” y se vuelve “el lugar donde Buenos Aires sigue viviendo”.

## 14. Qué se puede hacer ahora vs después

### Hacer ahora

- Documento de arquitectura y decisión de producto.
- `timezone` y `tripId` preparados.
- Timeline derivado local.
- Naming editorial de recuerdos espontáneos.
- `origin` y `capturedAt` para nuevas memorias.
- Interludios en contrato, si se hacen sin tratarlos como capítulos normales.

### Preparar ahora, implementar después

- `User`, `TripMember`, `uploadedBy`.
- `MemoryAsset` completo.
- `NotificationSchedule`.
- `Revivir` como motor guiado.
- Migración limpia de Preparativos al Memory Engine.

### Esperar

- Login real.
- Invitaciones multiusuario.
- Web Push/backend scheduler.
- Audio.
- Video en Aurora nueva.
- CRDT/conflictos complejos.
- Authoring avanzado.

## 15. Segunda pasada crítica: producto, UX y arquitectura

Esta sección revisa la visión con una exigencia más alta: no basta con que una idea sea linda. Tiene que proteger la identidad de Aurora.

La pregunta correcta para cada feature no es “¿se puede hacer?”.

La pregunta correcta es:

> ¿Esto hace que Aurora conserve mejor una vida compartida, o la empuja hacia una app genérica?

### Resumen ejecutivo

| Idea | Veredicto | Por qué |
|---|---|---|
| Timeline global del viaje | Sí, debe existir. | Es la forma más fuerte de convertir un viaje en relato completo. |
| Favoritos | Sí, pero como curaduría emocional, no ranking ni métrica. | Puede convertirse en “lo que más significa”, no “lo más usado”. |
| Personas en recuerdos | Sí, preparado con tags manuales y opcionales. | Aporta mucho a largo plazo si no se vuelve reconocimiento facial ni red social. |
| Lugares | Sí, como contexto narrativo. | Permite reconstruir vínculos con lugares sin depender de actividades exactas. |
| Emociones | Sí, con extremo cuidado. | Puede ser precioso si es liviano; artificial si parece formulario. |
| Recuerdos del futuro | Sí, pero separados de la historia vivida. | Deben ser promesas o deseos, no tareas pendientes. |
| Cartas | Sí, identidad central de producto. | Una colección de cartas puede ser el alma de Aurora a 10 años. |
| Momentos vs Memorias | Sí: “Momento” debe ser el modelo mental principal. | Aurora no guarda archivos ni “memories” técnicas; conserva momentos vividos. |

## 16. Timeline global del viaje

### Veredicto

Sí. El timeline global no solo tiene sentido: probablemente sea la pieza que une todo.

Hoy el documento piensa bien por día. Pero una biblioteca emocional necesita también una vista de “la obra completa”.

El viaje no se recuerda solo como:

- Día 1;
- Día 2;
- Día 3;
- Día 4.

También se recuerda como una continuidad:

```text
Preparativos
↓
Rumbo a Buenos Aires
↓
Primer día
↓
Segundo día
↓
Tercer día
↓
Último día
↓
De vuelta a casa
↓
Epílogo
↓
Carta
```

Eso es más cercano a un documental íntimo que a un álbum.

### Cómo convive con capítulos

Los capítulos no desaparecen. Siguen siendo la unidad editorial de lectura.

El timeline global es una capa superior:

- los capítulos ordenan la experiencia mientras se vive;
- el timeline global reconstruye la experiencia cuando ya fue vivida.

La arquitectura debe permitir ambas escalas:

```text
Timeline del día
  dentro de un capítulo

Timeline global
  atraviesa todo el viaje
```

### Cómo convive con el álbum

El álbum no debería ser la vista principal del recuerdo.

El álbum debería ser una colección derivada del timeline:

- “ver todas las fotos”;
- “ver todos los videos”;
- “ver favoritos”;
- “ver por lugar”.

Pero la historia principal no es el álbum.

La historia principal es el timeline global.

### Cómo convive con Explorar

Explorar es navegación libre:

- abrir capítulos;
- entrar a días;
- ver lugares;
- revisar carta;
- ver favoritos;
- abrir álbum.

Explorar es una biblioteca abierta.

### Cómo convive con Revivir

Revivir usa el timeline global como guion.

No muestra un índice. No muestra carpetas. No pregunta “qué querés ver”.

Guía:

```text
“Así empezó.”
“Así siguió.”
“Así terminó.”
“Esto quedó.”
```

### Riesgo

Si el timeline global se diseña como lista infinita, mata la magia.

Tiene que sentirse como una película editorial navegable, no como activity feed.

Regla:

> Timeline global sí. Feed social no.

## 17. Favoritos

### Veredicto

Sí, pero hay que cambiar el significado.

Hoy “favorito” es una acción técnica: marcar un corazón. Eso está bien como base, pero emocionalmente todavía no dice nada.

El error sería convertirlo en:

- ranking;
- métrica;
- “más visto”;
- “top 10” automático;
- competencia entre recuerdos.

Eso mete lógica de consumo donde debería haber intimidad.

### Dirección correcta

Favoritos debe significar:

> “Esto merece volver a encontrarnos.”

Posibles experiencias:

- “Nuestros momentos favoritos”.
- “Lo que siempre volvemos a mirar”.
- “Los recuerdos que elegimos guardar cerca”.
- “Las fotos que cuentan este viaje sin explicarlo”.

### Qué preparar arquitectónicamente

No alcanza con `favorite: true`.

A futuro conviene distinguir:

- favorito manual;
- destacado por carta/epílogo;
- recuerdo usado como portada;
- recuerdo elegido para Revivir;
- recuerdo revisitado muchas veces, si alguna vez se mide uso.

Pero OJO: medir relecturas puede ser útil internamente; mostrarlo como “más visto” puede ensuciar el tono.

Recomendación:

```ts
type MomentHighlight = {
  momentId: string;
  reason: 'favorite' | 'cover' | 'letter' | 'revisit' | 'manual_collection';
  createdBy?: string;
  createdAt: string;
};
```

No implementar ahora. Solo no encerrar el futuro en un booleano pobre.

## 18. Personas dentro de recuerdos

### Veredicto

Sí, vale la pena prepararlo.

Pero con una restricción fuerte:

> Personas sí. Reconocimiento facial no. Red social no.

Aurora no necesita saber quién aparece en una foto por inteligencia artificial. Necesita permitir que el recuerdo diga, si la persona quiere:

> “Este momento fue nuestro.”

### Valor de producto

En diez años, esto permite experiencias hermosas:

- “Momentos donde estamos los dos”.
- “Viajes donde Kari aparece más feliz”.
- “Fotos de Camilo mirando la ciudad”.
- “Cartas donde aparecemos juntos”.
- “Recuerdos compartidos con amigos/familia”.

Pero tiene que ser opcional y liviano.

No se pregunta en cada foto. No se convierte en etiquetado obligatorio.

### Arquitectura sugerida

Preparar una relación manual:

```ts
type Person = {
  id: string;
  displayName: string;
  relationship?: 'partner' | 'family' | 'friend' | 'traveler';
};

type MomentPerson = {
  momentId: string;
  personId: string;
  role: 'appears_in' | 'author' | 'mentioned' | 'dedicated_to';
};
```

Importante: `uploadedBy` no es lo mismo que “aparece en el recuerdo”.

- `uploadedBy`: quién agregó el momento.
- `people`: quién forma parte del momento.

## 19. Lugares

### Veredicto

Sí. Lugar debe ser un vínculo de primer nivel.

Hoy una memoria puede estar ligada a una actividad. Eso funciona cuando el recuerdo calza perfecto con el itinerario. Pero la vida real no funciona así.

Una foto puede ser de Puerto Madero aunque no pertenezca exactamente a “Cena en Cabaña Las Lilas”.

### Valor de producto

Permite:

- “Todos los recuerdos de Puerto Madero”.
- “Lugares que prometimos repetir”.
- “Dónde empezó cada día”.
- “La ciudad vista por nuestros recuerdos”.

Esto es clave si Aurora quiere ser una biblioteca emocional, porque los lugares se vuelven personajes secundarios de la historia.

### Riesgo

No convertirlo en app turística.

El lugar no debe empujar:

- reviews;
- horarios;
- recomendaciones genéricas;
- mapas invasivos;
- check-ins públicos.

Lugar en Aurora significa contexto emocional, no ficha turística.

### Arquitectura sugerida

Preparar:

```ts
type Moment = {
  placeId?: string | null;
  activityId?: string | null;
};
```

Y permitir que `placeId` exista aunque `activityId` sea null.

## 20. Emociones

### Veredicto

Sí, pero es una de las ideas más delicadas.

Puede ser preciosa:

> “Las palabras que definieron este viaje.”

Pero también puede volverse artificial rapidísimo si Aurora pregunta como formulario:

> “Selecciona una emoción.”

Eso NO.

### Dirección correcta

La emoción debe sentirse como una anotación poética, no como metadata.

Ejemplos buenos:

- tranquilidad;
- risa;
- sorpresa;
- amor;
- nostalgia;
- calma;
- vértigo;
- hogar;
- gratitud.

No tiene que ser emoji. No tiene que ser una taxonomía rígida.

### Cómo capturar sin romper la magia

Opciones aceptables:

- después de guardar un momento, Aurora puede ofrecer una pregunta suave: “¿Con qué palabra guardarías este momento?”;
- en el epílogo, Aurora puede preguntar: “¿Qué palabras se quedan con este viaje?”;
- en modo post-viaje, permitir agregar una palabra cuando el recuerdo ya reposó.

Opciones malas:

- pedir emoción en cada subida;
- usar sliders;
- pedir intensidad;
- convertirlo en estadísticas;
- generar gráficos tipo dashboard.

### Arquitectura sugerida

```ts
type MomentEmotion = {
  momentId: string;
  label: string;
  source: 'manual' | 'epilogue';
  createdAt: string;
};
```

No IA. No inferencia automática. Si Aurora adivina emociones, se vuelve invasiva.

## 21. Recuerdos del futuro

### Veredicto

Sí, con una condición: no deben mezclarse con el timeline de lo vivido.

Esto no es un recuerdo. Es una promesa.

Y esa diferencia importa.

### Valor de producto

Puede convertir Aurora en algo que conecta viajes:

Buenos Aires 2026 deja semillas para Buenos Aires 2028.

Ejemplos:

- “Volver a cenar en La Cabrera.”
- “Alojar de nuevo en este hotel.”
- “Caminar otra vez por Corrientes.”
- “Volver con más tiempo a El Ateneo.”

Esto tiene muchísimo valor a 10 años, porque Aurora deja de ser archivo y empieza a ser continuidad de vida.

### Riesgo

No convertirlo en lista de tareas.

No debería llamarse:

- pendientes;
- wishlist;
- TODO;
- planificación futura.

Debería sentirse como:

- “Promesas para volver”.
- “Cosas que nos gustaría repetir”.
- “Lo que este viaje dejó abierto”.
- “Semillas para otro viaje”.

### Arquitectura sugerida

```ts
type FutureWish = {
  id: string;
  sourceTripId: string;
  destination?: string;
  placeId?: string | null;
  text: string;
  createdAt: string;
  createdBy?: string;
  status: 'open' | 'fulfilled' | 'dismissed';
};
```

Cuando exista un nuevo viaje con el mismo destino, Aurora puede decir:

> La última vez dejaron una promesa abierta.

No ahora. Pero sí dejarlo diseñado.

## 22. Cartas

### Veredicto

Sí. Las cartas deberían ser parte central de la identidad de Aurora.

Si cada viaje es un libro, la carta es la página que justifica conservarlo.

### Valor a largo plazo

En diez años, una colección de cartas podría ser más poderosa que cualquier álbum:

- Carta de Buenos Aires.
- Carta de Mendoza.
- Carta de Japón.
- Carta de Chiloé.
- Carta de Torres del Paine.

Eso no es contenido accesorio. Es el hilo emocional de una vida compartida.

### Dirección de producto

Aurora debería permitir una “Biblioteca de cartas”:

- ordenadas por viaje;
- leíbles sin entrar al álbum completo;
- conectadas con fotos/momentos elegidos;
- privadas;
- sin likes;
- sin compartir público por defecto.

### Arquitectura sugerida

```ts
type Letter = {
  id: string;
  tripId: string;
  title: string;
  body: string;
  writtenAt: string;
  authorType: 'aurora' | 'traveler';
  relatedMomentIds?: string[];
};
```

Importante: si algún día hay cartas generadas por Aurora, deben sentirse curadas, no producidas en masa.

## 23. Momentos en lugar de memorias

### Veredicto

Sí. Conceptualmente “Moment” representa mejor a Aurora que “Memory”.

Esta es la mejora más importante de la segunda pasada.

### Por qué “Memory” queda corto

“Memory” suena a cosa guardada después:

- archivo;
- recuerdo;
- elemento de álbum;
- entidad de storage.

Sirve técnicamente, pero no empuja bien la visión.

Aurora no guarda “una memoria” como objeto aislado.

Aurora conserva un momento vivido:

- cuándo pasó;
- dónde pasó;
- con quién;
- cómo se sintió;
- qué lo representa;
- qué lo conectaba al viaje;
- por qué merece volver.

### Por qué “Moment” es mejor

“Momento” permite unir:

- fotos;
- videos;
- audios;
- notas;
- actividad relacionada;
- lugar;
- personas;
- emoción;
- autor;
- favorito;
- origen sugerido o espontáneo;
- interludio;
- epílogo.

Esto encaja mucho mejor con la frase:

> No todos los recuerdos se pueden planificar.

Porque lo que no se planifica no es “un archivo libre”.

Es un momento.

### Decisión recomendada

Adoptar “Momento” como modelo mental de producto.

No significa renombrar código ahora. NO hay que salir a cambiar `memoryStore.js` solo por estética.

Pero la arquitectura futura debería orientarse así:

```text
Trip
  tiene Chapters / Interludes
  tiene Moments

Moment
  tiene Assets
  tiene Notes
  puede tener Place
  puede tener People
  puede tener Emotion
  puede venir de SuggestedMoment o SpontaneousMoment
```

### Transición recomendada

1. Producto y documentación empiezan a hablar de “momentos”.
2. El dominio futuro puede introducir `Moment` como entidad conceptual.
3. `Memory` actual queda como implementación legacy/local o se migra gradualmente.
4. No hacer renombre masivo hasta que exista una razón funcional: timeline, personas, lugares o emociones.

Regla:

> Cambiar nombres sin cambiar conceptos es cosmética. Cambiar el modelo mental hacia Moment sí cambia la dirección del producto.

## 24. Visión a 10 años

Imaginemos que Aurora existe dentro de diez años.

Una pareja abre la app y adentro están:

- Buenos Aires;
- Mendoza;
- Japón;
- Chiloé;
- Torres del Paine;
- Europa;
- escapadas pequeñas;
- cartas;
- promesas cumplidas;
- lugares que volvieron;
- fotos imperfectas que importan más que las perfectas.

Aurora no debería abrir mostrando una grilla de viajes.

Tampoco debería abrir como dashboard.

Debería sentirse como entrar a una biblioteca íntima.

### Primera sensación

Abrir Aurora debería decir:

> “Esto es una vida compartida.”

No:

> “Estos son tus archivos.”

### Qué debería mostrar primero

Una portada viva, editorial y silenciosa:

- una carta reciente;
- un momento recuperado;
- una fecha que volvió a aparecer;
- una promesa abierta;
- un viaje disponible para revivir;
- una línea sutil: “Hace cinco años empezó Buenos Aires”.

No todo junto. Aurora debe elegir poco.

La escasez es parte del lujo emocional.

### Estructura posible a 10 años

```text
Biblioteca
  ↓
Viajes
  ↓
Momentos
  ↓
Cartas
  ↓
Promesas para volver
```

Pero visualmente no debe sentirse como menú de app. Debe sentirse como estantería, libro, archivo vivo, carta guardada.

### Qué debe permanecer igual

- El tono íntimo.
- La idea de capítulos.
- La ausencia de presión.
- La privacidad.
- La navegación editorial.
- La belleza lenta.
- La idea de que cada viaje se abre como un libro.

### Qué jamás debe pasar

Aurora nunca debe convertirse en:

- red social;
- feed público;
- ranking de recuerdos;
- app de productividad;
- galería infinita;
- mapa turístico;
- dashboard de métricas personales;
- IA que inventa emociones;
- app que exige completar cosas;
- lugar donde se compite por quién subió más.

## 25. Principios permanentes de Aurora

Estos principios no son técnicos. Son el contrato emocional del producto.

### 1. Aurora conserva historias, no archivos

Cada foto, nota, video o audio existe para contar algo. Si una función trata los recuerdos como archivos sueltos, no pertenece al centro de Aurora.

### 2. Cada viaje es un libro

Un viaje tiene portada, capítulos, interludios, cierre, carta y memoria. La estructura editorial es parte de la identidad, no una metáfora decorativa.

### 3. Lo vivido reemplaza a lo sugerido

Aurora puede proponer momentos durante el viaje, pero al recordar debe respetar lo que realmente ocurrió. La vida real siempre gana sobre el plan.

### 4. La emoción no se fuerza

Aurora puede invitar a nombrar una emoción, pero nunca exigirla. Si una interacción se siente como formulario, encuesta o tarea, está mal diseñada.

### 5. La intimidad vale más que la actividad

Aurora no busca engagement. No necesita que el usuario abra más, suba más o mire más. Necesita que cuando vuelva, algo importe.

### 6. No todo debe mostrarse

Una biblioteca emocional necesita silencio, selección y pausa. Mostrar menos puede ser más fiel al recuerdo que mostrarlo todo.

### 7. El tiempo forma parte del diseño

Algunas páginas deben esperar. Algunos recuerdos necesitan distancia. Aurora no debe apurar lo que emocionalmente necesita reposar.

### 8. Compartido no significa social

Un viaje puede pertenecer a dos o más personas sin convertirse en red social. Compartir en Aurora significa construir una memoria común, no publicar.

### 9. Los lugares son escenarios, no productos

Aurora puede recordar Puerto Madero, La Cabrera o El Ateneo, pero no debe tratarlos como fichas turísticas. Importan por lo que pasó allí.

### 10. Las cartas son memoria profunda

La carta no es un cierre decorativo. Es una cápsula emocional. A largo plazo, la colección de cartas puede ser una de las partes más valiosas de Aurora.

### 11. Los favoritos son curaduría, no ranking

Marcar algo como favorito no debe crear competencia ni métricas. Significa que ese momento merece volver a estar cerca.

### 12. Aurora no inventa la vida

Puede ordenar, cuidar, sugerir y recordar. No debe fabricar emociones, exagerar significados ni reemplazar la voz de quienes vivieron el viaje.

### 13. La arquitectura debe proteger la poesía

Los modelos técnicos existen para conservar la experiencia, no para dominarla. Si una decisión técnica empuja a Aurora hacia galería, feed o checklist, hay que corregirla.

## Cierre

La dirección correcta es clara: Aurora ya tiene estructura de libro, pero sus recuerdos todavía se comportan parcialmente como archivos guardados. La segunda pasada afina el centro: Aurora debe pensar en momentos, no en archivos.

La evolución no es “más features”. Es una transformación de modelo:

```text
itinerario + uploads
      ↓
capítulos + eventos + momentos
      ↓
biblioteca emocional del viaje
```

Si cuidamos esa transición, dentro de diez años Aurora no va a mostrar “fotos de Buenos Aires”.

Va a abrir una vida compartida.

## 26. Manifiesto de identidad de Aurora

Este capítulo no define una arquitectura.

Define una responsabilidad.

Antes de agregar una pantalla, una entidad, una notificación, una animación o una línea de código, cualquier persona que trabaje en Aurora debería poder responder una pregunta:

> ¿Esto cuida mejor una vida compartida?

Si la respuesta no es clara, Aurora debe esperar.

### ¿Qué es Aurora realmente?

Aurora no es una app de viajes.

Aurora nació con un viaje porque los viajes tienen una forma narrativa evidente: preparativos, partida, días, regreso, epílogo. Pero esa no es su frontera. Es apenas su primera historia.

Aurora trata sobre momentos importantes de una vida compartida.

Un viaje es uno de esos momentos.

También pueden serlo:

- un matrimonio;
- un primer hogar;
- un aniversario;
- el nacimiento de un hijo;
- una celebración familiar;
- una despedida;
- una mudanza;
- una escapada mínima;
- una etapa que no tuvo destino, pero sí significado.

La categoría no importa tanto como la huella.

Aurora existe para conservar aquello que, con el tiempo, una persona no quiere perder de vista.

No todo merece entrar en Aurora.

No porque no sea importante, sino porque Aurora no busca guardar la totalidad de la vida. Busca cuidar sus capítulos más significativos.

### La unidad real no es el viaje

La unidad real de Aurora es la historia vivida.

Hoy esa historia se llama “Buenos Aires 2026”.

Mañana podría llamarse “Nuestro primer hogar”.

Pasado mañana podría llamarse “Cuando nació nuestra hija”.

La arquitectura puede empezar con viajes, pero la filosofía no debe quedar encerrada ahí.

Si Aurora se diseña solo como app de viajes, un día va a mirar un matrimonio, una casa o una infancia y no va a saber qué hacer con eso.

Y eso sería un error de producto.

Aurora debe poder crecer hacia distintos tipos de historias sin perder su forma editorial:

```text
Historia
  tiene portada
  tiene momentos
  tiene personas
  tiene tiempo
  tiene pausas
  tiene cierre
  puede tener cartas
  puede volver a abrirse años después
```

El viaje es el primer formato.

La vida compartida es el verdadero dominio.

### El verdadero protagonista

Aurora no recuerda ciudades.

Aurora recuerda personas viviendo algo juntas.

Buenos Aires no es el protagonista.

El protagonista es:

> nosotros en Buenos Aires.

Mendoza no importa por sus bodegas.

Importa porque alguien se rió en una mesa, porque una conversación quedó dando vueltas, porque una foto imperfecta terminó explicando mejor el viaje que cualquier postal.

El destino es escenario.

Las personas son historia.

Esto cambia decisiones de producto.

#### Cambia el lenguaje

Aurora no debería hablar como guía:

> “Visitaste Puerto Madero.”

Debería hablar como memoria:

> “Esa noche caminaron por Puerto Madero sin querer volver todavía.”

No:

> “Fotos de Buenos Aires.”

Sí:

> “Ustedes, en Buenos Aires.”

No:

> “Lugares visitados.”

Sí:

> “Los lugares donde algo quedó.”

#### Cambia la navegación

La navegación no debería organizarse solo por destino, fecha o álbum.

También debería poder organizarse por vínculos:

- nuestras cartas;
- nuestros momentos favoritos;
- lugares a los que prometimos volver;
- historias donde estamos juntos;
- palabras que se repiten en nuestra vida;
- años que nos cambiaron.

No todo eso tiene que existir ahora.

Pero Aurora debería estar preparada filosóficamente para llegar ahí.

#### Cambia los modelos

No en código hoy.

Pero sí en dirección:

- un momento no pertenece únicamente a un viaje;
- también pertenece a personas;
- puede pertenecer a un lugar;
- puede cargar una emoción;
- puede dejar una promesa futura;
- puede aparecer años después en una carta, en un aniversario o en otra historia.

Esto confirma la decisión más importante de la segunda pasada:

> Aurora no debería pensar primero en archivos, ni siquiera en memorias técnicas. Debería pensar en momentos.

### La memoria de Aurora

Aurora debería recordar cosas que las personas ya olvidaron.

No inventarlas.

No exagerarlas.

No completarlas con inteligencia artificial.

Recordarlas.

Hay una diferencia enorme.

Inventar es fabricar significado.

Recordar es cuidar significado que ya existía.

Aurora puede decir, años después:

> Hace tres años marcaron Rapanui como uno de sus lugares favoritos.

O:

> En Buenos Aires escribieron que querían volver a caminar por Corrientes de noche.

O:

> La última vez que estuvieron en esta ciudad, dejaron una promesa abierta.

Eso no es IA.

Eso es memoria con intención.

### Recordar no es sorprender por sorprender

Aurora no debería comportarse como una app que busca impresionar.

No necesita decir:

> “Mira todo lo que sé de ustedes.”

Debe decir, con cuidado:

> “Esto estaba guardado. Tal vez hoy tenga sentido volver a abrirlo.”

La memoria de Aurora debe ser:

- discreta;
- verificable;
- basada en cosas que los usuarios realmente guardaron;
- respetuosa del tiempo;
- fácil de ignorar;
- nunca invasiva.

La memoria de Aurora no existe para demostrar inteligencia.

Existe para devolver contexto emocional.

### Qué NO es Aurora

Esta sección es una barrera de protección.

Cada vez que una decisión futura parezca conveniente, rentable o técnicamente interesante, debe compararse contra esto.

#### Aurora no es una red social

No existe para publicar.

No existe para acumular reacciones.

No existe para mostrar una vida hacia afuera.

Compartir en Aurora significa construir una memoria común, no buscar una audiencia.

#### Aurora no es una nube para subir fotos

Puede guardar fotos.

Pero no existe para almacenar archivos.

Si una foto no forma parte de una historia, Aurora no tiene por qué tratarla como protagonista.

Aurora no compite con Google Photos, iCloud ni una galería del teléfono.

#### Aurora no es una app de productividad

No hay tareas.

No hay rachas.

No hay presión por completar.

No hay porcentaje emocional.

Un capítulo incompleto no es un fracaso.

Un recuerdo no guardado no es una deuda.

#### Aurora no es una guía turística

Puede conocer lugares.

Puede sugerir momentos.

Puede acompañar una ciudad.

Pero su objetivo no es optimizar un itinerario.

Aurora no existe para que vean más.

Existe para que recuerden mejor lo que vivieron.

#### Aurora no es un dashboard

La vida compartida no necesita gráficos.

No necesita KPIs.

No necesita métricas de uso.

Si una pantalla convierte la emoción en rendimiento, esa pantalla no pertenece al centro de Aurora.

#### Aurora no es una IA que inventa emociones

Aurora puede ordenar.

Puede cuidar.

Puede recuperar.

Puede invitar.

Pero no debe fabricar sentimientos que nadie expresó.

La emoción real, aunque sea pequeña, vale más que una emoción generada perfectamente escrita.

#### Aurora no es una máquina de engagement

No existe para retener usuarios.

No existe para aumentar sesiones.

No existe para crear ansiedad de volver.

Si alguien abre Aurora una vez al año y llora con una carta, Aurora funcionó.

### Aurora nunca corre

Este principio debe formar parte permanente de Aurora.

Aurora nunca corre.

No corre para mostrar un capítulo.

No corre para pedir una foto.

No corre para cerrar un viaje.

No corre para convertir una experiencia en contenido.

No corre para empujar una notificación.

No corre para revivir algo antes de que tenga sentido.

Aurora espera.

Los capítulos esperan.

Las cartas esperan.

Los recuerdos esperan.

Revivir espera.

La vida no necesita convertirse inmediatamente en archivo.

Algunas historias necesitan distancia.

Algunos momentos solo revelan su valor años después.

Aurora debe respetar ese ritmo.

Este principio prohíbe muchas tentaciones:

- streaks;
- urgencia artificial;
- FOMO;
- “te falta completar”;
- “sube algo ahora”;
- “hace mucho que no entras”;
- “tu viaje está al 80%”;
- “no pierdas este recuerdo”.

Aurora nunca debe hablar desde la ansiedad.

Debe hablar desde el cuidado.

### La pregunta de los veinte años

Dentro de veinte años, todo lo técnico puede haber cambiado.

Los frameworks de hoy van a desaparecer.

Los formatos de archivo van a cambiar.

Las interfaces van a ser distintas.

Quizás ya no toquemos pantallas como ahora.

Pero Aurora debería seguir siendo reconocible.

No por su tecnología.

Por su alma.

Deberían seguir iguales estas cosas:

#### 1. Aurora debe seguir siendo privada

La memoria íntima no debe depender de una audiencia.

Si Aurora algún día permite compartir, debe ser desde la intención, nunca desde la exposición.

#### 2. Aurora debe seguir siendo lenta

No lenta como torpe.

Lenta como una carta.

Lenta como abrir una caja guardada.

Lenta como volver a una foto que no se entendía del todo cuando fue tomada.

#### 3. Aurora debe seguir poniendo a las personas por encima de los lugares

Los destinos cambian.

Las ciudades pasan.

La historia es de quienes la vivieron.

#### 4. Aurora debe seguir respetando lo real

No debe inventar recuerdos.

No debe fabricar nostalgia.

No debe escribir una vida que no ocurrió.

Debe cuidar lo que sí ocurrió.

#### 5. Aurora debe seguir eligiendo silencio

No todo requiere notificación.

No todo requiere animación.

No todo requiere pantalla.

A veces, el gesto más elegante es no interrumpir.

#### 6. Aurora debe seguir siendo editorial

Cada historia debe sentirse compuesta.

No como feed.

No como carpeta.

No como backup.

Como libro.

#### 7. Aurora debe seguir entendiendo que el tiempo cambia el valor de las cosas

Una foto común puede volverse importante.

Una nota breve puede convertirse en carta.

Una promesa olvidada puede abrir una nueva historia.

Aurora debe permitir que el tiempo haga su trabajo.

### Manifiesto final

Aurora existe porque la vida compartida pasa rápido.

No rápido como calendario.

Rápido como conversación que parecía pequeña y después se vuelve inolvidable.

Rápido como una caminata sin foto perfecta.

Rápido como una frase escrita tarde, con sueño, al final de un día que todavía no sabíamos cuánto iba a importar.

Aurora no intenta detener la vida.

No intenta ordenarla por completo.

No intenta convertir cada instante en contenido.

Aurora acepta que no todo puede guardarse.

Y por eso cuida mejor lo que sí se guarda.

Una ciudad puede iniciar una historia.

Un viaje puede darle forma.

Una casa, una carta, una promesa o una celebración pueden continuarla.

Pero el centro nunca es el lugar.

El centro son las personas.

Lo que vivieron.

Lo que eligieron recordar.

Lo que el tiempo volvió más valioso.

Aurora debe ser una biblioteca para esas cosas.

Una biblioteca sin ruido.

Sin vitrinas.

Sin competencia.

Sin urgencia.

Una biblioteca donde cada historia pueda abrirse cuando tenga sentido.

Donde los recuerdos no sean archivos, sino momentos.

Donde las cartas no sean cierres, sino cápsulas.

Donde los lugares no sean destinos, sino escenarios de algo que pasó entre personas.

Donde una promesa escrita hace años pueda volver suavemente y decir:

> esto todavía vive acá.

Si dentro de veinte años Aurora sigue existiendo, no debería importar con qué tecnología fue construida.

Debería importar que al abrirla alguien sienta:

> esto fuimos nosotros.

Y que esa frase alcance.

Porque Aurora no existe para mostrar una vida perfecta.

Existe para cuidar una vida compartida.
