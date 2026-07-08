// Traduce un StoryView + Story Package a HTML (string). Función pura: mismo input,
// mismo output siempre. No toca `document`, no lee el reloj — `now` se recibe como
// parámetro para poder calcular la cuenta regresiva de pre_trip sin dejar de ser pura.
// Ver IMPLEMENTATION_PHASE_4.md.

import { StoryMode } from '../story/storyEngine/storyEngine.js';
import { ChapterStatus, getChapterReferenceDate } from '../story/storyProgress/storyProgress.js';
import { resolveChapterContent } from './chapterContent.js';

// El índice nunca dice "todavía no"/"aún no"/"bloqueado"/"pendiente" (copy
// negativo, E-6 corrección): un capítulo futuro solo muestra su fecha y una
// frase breve propia — nunca la misma repetida en cada capítulo.
const STATUS_LABEL = {
  [ChapterStatus.AVAILABLE]: 'Hoy',
  [ChapterStatus.STARTED]: 'Hoy',
  [ChapterStatus.COMPLETED]: 'Vivido',
};

/**
 * Una frase breve y distinta por capítulo futuro — nunca la misma promesa
 * repetida (E-6, corrección). Indexado por `order`; un capítulo fuera de
 * este rango (viaje más largo) cae en un genérico que sigue sin repetir
 * información ya mostrada (la fecha). Presentación pura: no es narrativa
 * del Story Package, es solo el tono del índice.
 */
const CHAPTER_TEASERS = [
  'Todo empieza acá.',
  'La ciudad se empieza a abrir.',
  'Buenos Aires ya se siente distinta.',
  'Un último regalo antes de volver.',
];

function teaserForChapter(order) {
  return CHAPTER_TEASERS[order - 1] ?? 'Un nuevo capítulo se acerca.';
}

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "10 de julio" — sin año ni hora, la fecha como una promesa, no un dato técnico. */
function formatChapterDate(date) {
  return `${date.getUTCDate()} de ${MONTHS_ES[date.getUTCMonth()]}`;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Identifica el "cajón" de fotos en curso (todavía sin guardar) de una actividad,
 * del espacio libre general (`activityId: null`) o de un prompt del epílogo
 * (que usa su propio `prompt.id` como activityId). Debe coincidir exactamente
 * con el mismo cálculo en `experienceView.js` — por eso vive acá, exportado.
 */
export function photoSlotKey(chapterId, activityId) {
  return `${chapterId}::${activityId ?? ''}`;
}

/**
 * Una invitación quieta a instalar Aurora (Épica 4) — nunca un modal, nunca
 * bloquea nada. Android/Chrome tienen `beforeinstallprompt`; iOS no tiene
 * ningún gesto programático, así que ahí solo se puede mostrar el camino manual.
 */
function renderInstallBanner(installBanner) {
  if (!installBanner) {
    return '';
  }
  if (installBanner.platform === 'ios') {
    return `
      <div class="install-banner">
        <button type="button" class="install-dismiss" data-action="dismiss-install" aria-label="Después">×</button>
        <p>Para guardar Aurora en tu pantalla de inicio, toca <strong>Compartir</strong> y luego <strong>"Agregar a inicio"</strong>.</p>
      </div>
    `;
  }
  return `
    <div class="install-banner">
      <button type="button" class="install-dismiss" data-action="dismiss-install" aria-label="Después">×</button>
      <p>Aurora puede quedarse contigo, en tu pantalla de inicio.</p>
      <button type="button" data-action="install-app">Guardar</button>
    </div>
  `;
}

/**
 * Un pedido quieto de permiso de notificaciones (Épica 4), solo cuando hay algo
 * real para avisar hoy — nunca al abrir la app por primera vez, sin motivo.
 */
function renderNotificationPrompt(pendingNotification) {
  if (!pendingNotification) {
    return '';
  }
  return `
    <div class="notification-prompt">
      <p>${pendingNotification.body} ¿Querés que Aurora te avise en momentos así?</p>
      <button type="button" data-action="allow-notifications">Avisame</button>
      <button type="button" data-action="dismiss-notification-prompt">Ahora no</button>
    </div>
  `;
}

function buildChapterSummary(view, storyPackage) {
  return storyPackage.chapters.map((chapter) => {
    let status = ChapterStatus.LOCKED;
    if (view.completedChapters.includes(chapter.id)) {
      status = ChapterStatus.COMPLETED;
    } else if (view.visibleChapter?.id === chapter.id) {
      status = view.visibleChapter.status;
    } else if (view.availableChapters.includes(chapter.id)) {
      status = ChapterStatus.AVAILABLE;
    }
    return {
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      status,
      referenceDate: getChapterReferenceDate(chapter, storyPackage),
    };
  });
}

/** Numeración de capítulo como en el índice de un libro — nunca un badge. */
function toRoman(number) {
  const table = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let remaining = number;
  let roman = '';
  for (const [value, symbol] of table) {
    while (remaining >= value) {
      roman += symbol;
      remaining -= value;
    }
  }
  return roman || String(number);
}

/**
 * El índice de capítulos (E-2, corregido en E-6): tabla de contenidos de un libro,
 * no chips — y nunca un spoiler. Un capítulo futuro solo muestra su fecha, nunca
 * su título real; el capítulo actual y los ya vividos sí lo muestran.
 */
function renderChapterList(view, storyPackage, extraClass = '') {
  const items = buildChapterSummary(view, storyPackage)
    .map(({ title, order, status, referenceDate }) => {
      const isLocked = status === ChapterStatus.LOCKED;
      const label = isLocked ? formatChapterDate(referenceDate) : title;
      const statusLine = isLocked ? teaserForChapter(order) : STATUS_LABEL[status];
      return `
      <li class="chapter-index-item${isLocked ? ' chapter-index-item-locked' : ''}">
        <span class="chapter-index-number">${toRoman(order)}</span>
        <span class="chapter-index-text">
          <span class="chapter-index-title">${label}</span>
          <span class="chapter-index-status">${statusLine}</span>
        </span>
      </li>
    `;
    })
    .join('');
  return `<ol class="chapter-index ${extraClass}">${items}</ol>`;
}

/**
 * El bloque de índice como página propia del libro (E-6): siempre el mismo
 * contenido, en cada modo — nunca una copia. `pendingReveal` solo se usa la
 * primera vez que se abre Aurora: el título y los capítulos empiezan
 * invisibles y `experienceView.js` los revela (clase `is-revealing`) cuando
 * termina el video y el último frame ya fundió al carbón cálido.
 */
function renderIndexPage(view, storyPackage, { pendingReveal = false, revealing = false, extraClass = '', showParticles = false } = {}) {
  const classes = ['book-page', 'page-index', extraClass, pendingReveal ? 'page-index-pending' : '', revealing ? 'is-revealing' : '']
    .filter(Boolean)
    .join(' ');
  return `
    <section class="${classes}">
      ${showParticles ? renderIntroParticles('index-particles') : ''}
      <p class="eyebrow">Tu viaje</p>
      <h2 class="page-index-title">Capítulos</h2>
      ${renderChapterList(view, storyPackage)}
    </section>
  `;
}

/**
 * La línea del viaje (recuperada del concepto original): un trazo fino entre el
 * origen y el destino. Solo aparece si el Story Package define `metadata.origin`
 * — es un campo opcional, así que su ausencia nunca se resalta (nunca un guion
 * vacío ni un placeholder).
 */
function renderTravelLine(origin, destination) {
  if (!origin) {
    return '';
  }
  return `
    <div class="travel-line reveal reveal-2" aria-hidden="true">
      <span class="travel-line-city">${origin}</span>
      <span class="travel-line-route">
        <svg class="travel-line-svg" viewBox="0 0 240 24" preserveAspectRatio="none">
          <line class="travel-line-stroke" x1="4" y1="12" x2="236" y2="12" />
        </svg>
        <span class="travel-line-plane">✈</span>
      </span>
      <span class="travel-line-city">${destination}</span>
    </div>
  `;
}

/**
 * @param {object} [options]
 * @param {boolean} [options.confirmingClose=false] - Si ya se pidió cerrar y se está mostrando la confirmación cálida (E-4).
 * @param {boolean} [options.useConfirmation=true] - Si este capítulo pasa por el ritual de confirmación al cerrar.
 * @param {string} [options.confirmQuestion] - Pregunta de la confirmación cálida (distinta para el epílogo).
 * @param {string} [options.confirmLabel] - Texto del botón que sí cierra.
 * @param {string} [options.cancelLabel] - Texto del botón que sigue sin cerrar.
 */
function renderActionButton(chapterId, status, interactive, options = {}) {
  const {
    confirmingClose = false,
    useConfirmation = true,
    confirmQuestion = '¿Querés cerrar el día así como fue?',
    confirmLabel = 'Sí, cerrar por hoy',
    cancelLabel = 'Seguir un rato más',
  } = options;

  if (!interactive) {
    return '';
  }
  if (status === ChapterStatus.AVAILABLE) {
    return `<div class="actions"><button type="button" data-action="start" data-chapter-id="${chapterId}">Marcar como iniciado</button></div>`;
  }
  if (status === ChapterStatus.STARTED) {
    if (!useConfirmation) {
      return `<div class="actions"><button type="button" data-action="complete" data-chapter-id="${chapterId}">Cerrar capítulo</button></div>`;
    }
    if (confirmingClose) {
      return `
        <div class="actions actions-confirm">
          <p class="confirm-question">${confirmQuestion}</p>
          <div class="confirm-buttons">
            <button type="button" data-action="cancel-close" data-chapter-id="${chapterId}">${cancelLabel}</button>
            <button type="button" data-action="complete" data-chapter-id="${chapterId}">${confirmLabel}</button>
          </div>
        </div>
      `;
    }
    return `<div class="actions"><button type="button" data-action="ask-close" data-chapter-id="${chapterId}">Cerrar capítulo</button></div>`;
  }
  return '';
}

/** El hueco entre "cerré hoy" y "todavía no amanece mañana" (E-4): nunca vacío, nunca revela el día siguiente. */
function renderClosingMessage(view, storyPackage) {
  const lastClosed = storyPackage.chapters
    .filter((chapter) => view.completedChapters.includes(chapter.id))
    .sort((a, b) => b.order - a.order)[0];

  if (!lastClosed) {
    return '';
  }

  const closeLine = lastClosed.copy?.close ?? storyPackage.baseCopy.dailyCloseTemplate;
  return `
    <section class="chapter-closing">
      <p class="eyebrow reveal reveal-1">${lastClosed.title}</p>
      <p class="open reveal reveal-2">${closeLine}</p>
    </section>
  `;
}

function resolveLocation(activity, place) {
  return activity.location ?? place?.location ?? null;
}

function resolveWebsiteUrl(activity, place) {
  return activity.websiteUrl ?? place?.websiteUrl ?? null;
}

function renderLinks(location, websiteUrl) {
  const links = [];
  if (location?.googleMapsUrl) {
    links.push(`<a href="${location.googleMapsUrl}" target="_blank" rel="noopener">Mapa</a>`);
  }
  if (location?.uberDeepLink) {
    links.push(`<a href="${location.uberDeepLink}" target="_blank" rel="noopener">Uber</a>`);
  }
  if (location?.cabifyDeepLink) {
    links.push(`<a href="${location.cabifyDeepLink}" target="_blank" rel="noopener">Cabify</a>`);
  }
  if (websiteUrl) {
    links.push(`<a href="${websiteUrl}" target="_blank" rel="noopener">Sitio web</a>`);
  }
  return links.length === 0 ? '' : `<p class="links">${links.join(' · ')}</p>`;
}

/** La Memoria más reciente de una lista (o null). Usada cuando hay más de una para el mismo lugar. */
function mostRecent(memories) {
  if (!memories || memories.length === 0) {
    return null;
  }
  return memories.reduce((latest, memory) => (!latest || memory.createdAt > latest.createdAt ? memory : latest));
}

/**
 * Las fotos de una Memoria ya guardada: la primera del array es siempre la
 * principal (Memory Engine no gana un campo nuevo — el orden ya alcanza para
 * representarlo). `photoUrls` llega resuelto desde `experienceView.js`
 * (id de foto → object URL); un id sin URL resuelta simplemente no se pinta.
 */
function renderMemoryPhotos(memory, photoUrls) {
  const photos = memory.photos ?? [];
  if (photos.length === 0) {
    return '';
  }
  const [primaryId, ...restIds] = photos;
  const primary = photoUrls[primaryId] ? `<img class="memory-photo-primary" src="${photoUrls[primaryId]}" alt="" />` : '';
  const rest = restIds
    .map((id) => (photoUrls[id] ? `<img class="memory-photo-thumb" src="${photoUrls[id]}" alt="" />` : ''))
    .join('');
  return `<div class="memory-photos">${primary}${rest}</div>`;
}

/** Un recuerdo ya guardado, mostrado en el mismo lugar donde antes estaba la invitación (E-3). */
function renderSavedMemory(memory, photoUrls = {}) {
  return `
    <div class="memory-slot memory-slot-saved">
      ${renderMemoryPhotos(memory, photoUrls)}
      ${memory.note ? `<p class="memory-note">${memory.note}</p>` : ''}
      <div class="memory-actions">
        <button type="button" data-action="favorite-memory" data-memory-id="${memory.id}">
          ${memory.favorite ? '♥ Recuerdo favorito' : '♥ Marcar como favorito'}
        </button>
        <button type="button" data-action="archive-memory" data-memory-id="${memory.id}">Guardar aparte</button>
      </div>
    </div>
  `;
}

/**
 * Las fotos todavía sin guardar de un cajón (Épica 3): miniaturas con "Quitar" y
 * "Hacer principal" (la primera de la lista siempre es la principal), y el
 * control para agregar más. Vive dentro de `renderMemoryInvitation`.
 */
function renderPhotoStaging(chapterId, activityId, staged) {
  const thumbs = staged
    .map(
      (photo, index) => `
        <li class="staged-photo${index === 0 ? ' is-primary' : ''}">
          <img src="${photo.url}" alt="" />
          <div class="staged-photo-actions">
            ${
              index === 0
                ? '<span class="staged-photo-label">Principal</span>'
                : `<button type="button" data-action="set-primary-photo" data-chapter-id="${chapterId}" data-activity-id="${activityId ?? ''}" data-temp-id="${photo.tempId}">Hacer principal</button>`
            }
            <button type="button" data-action="remove-staged-photo" data-chapter-id="${chapterId}" data-activity-id="${activityId ?? ''}" data-temp-id="${photo.tempId}">Quitar</button>
          </div>
        </li>
      `
    )
    .join('');
  return `
    <div class="photo-staging">
      ${thumbs ? `<ul class="staged-photos">${thumbs}</ul>` : ''}
      <label class="add-photos-label">
        + Agregar fotos
        <input type="file" accept="image/*" multiple class="add-photos-input" data-chapter-id="${chapterId}" data-activity-id="${activityId ?? ''}" hidden />
      </label>
    </div>
  `;
}

/**
 * Una invitación abierta a guardar un recuerdo — nunca una instrucción. En modo
 * `quiet` (una actividad sin recuerdo sugerido, Épica 3) no hay pregunta ni nota
 * hasta que la persona agrega algo por su cuenta — solo el gesto de agregar una foto,
 * disponible siempre, sin pedir nada.
 */
function renderMemoryInvitation({ chapterId, activityId, question, hint, staged = [], quiet = false }) {
  const engaged = !quiet || staged.length > 0;
  return `
    <div class="memory-slot memory-slot-invitation${quiet ? ' memory-slot-quiet' : ''}">
      ${question ? `<p class="memory-invitation-question">${question}</p>` : ''}
      ${hint ? `<p class="memory-invitation-hint">${hint}</p>` : ''}
      ${engaged ? '<textarea class="memory-note-input" placeholder="Escribí algo que quieras recordar..."></textarea>' : ''}
      ${renderPhotoStaging(chapterId, activityId, staged)}
      ${engaged ? `<button type="button" data-action="create-memory" data-chapter-id="${chapterId}" data-activity-id="${activityId ?? ''}">Guardar este recuerdo</button>` : ''}
    </div>
  `;
}

function renderActivityMemorySlot({ chapterId, activity, suggestedMemories, existingMemory, interactive, photoUrls, staged }) {
  if (!interactive) {
    return '';
  }
  if (existingMemory) {
    return renderSavedMemory(existingMemory, photoUrls);
  }
  const hasHint = suggestedMemories.length > 0;
  return renderMemoryInvitation({
    chapterId,
    activityId: activity.id,
    question: hasHint ? '¿Hay algo de esto que quieras guardar?' : '',
    hint: hasHint ? suggestedMemories.map((memory) => memory.prompt).join(' · ') : '',
    staged,
    quiet: !hasHint,
  });
}

function renderActivityCard({ activity, place, suggestedMemories }, chapterId, memoriesByActivityId, interactive, photoUrls, stagedPhotosBySlot) {
  const location = resolveLocation(activity, place);
  const websiteUrl = resolveWebsiteUrl(activity, place);
  const existingMemory = mostRecent(memoriesByActivityId.get(activity.id));
  const staged = stagedPhotosBySlot.get(photoSlotKey(chapterId, activity.id)) ?? [];

  return `
    <li class="activity-card">
      <div class="activity-head">
        ${activity.timeWindow ? `<span class="time">${activity.timeWindow}</span>` : ''}
        ${activity.category ? `<span class="category">${activity.category}</span>` : ''}
      </div>
      <p class="activity-title">${activity.title}</p>
      ${activity.description ? `<p class="activity-description">${activity.description}</p>` : ''}
      ${location?.name ? `<p class="location">${location.name}</p>` : ''}
      ${place?.recommendation ? `<p class="recommendation">${place.recommendation}</p>` : ''}
      ${renderLinks(location, websiteUrl)}
      ${renderActivityMemorySlot({ chapterId, activity, suggestedMemories, existingMemory, interactive, photoUrls, staged })}
    </li>
  `;
}

function renderRelatedPlaces(relatedPlaces) {
  if (relatedPlaces.length === 0) {
    return '';
  }
  const items = relatedPlaces
    .map(
      (place) => `
        <li>
          <p class="place-name">${place.name}</p>
          ${place.recommendation ? `<p class="recommendation">${place.recommendation}</p>` : ''}
          ${renderLinks(place.location, place.websiteUrl)}
        </li>
      `
    )
    .join('');
  return `<section class="related-places"><p class="section-title">Lugares para hoy</p><ul>${items}</ul></section>`;
}

function renderPhotoSpots(photoSpots) {
  if (photoSpots.length === 0) {
    return '';
  }
  const items = photoSpots
    .map(
      (spot) => `
        <li>
          <p class="spot-title">${spot.title}</p>
          ${spot.bestTime ? `<p class="spot-time">${spot.bestTime}</p>` : ''}
          ${spot.tip ? `<p class="spot-tip">${spot.tip}</p>` : ''}
        </li>
      `
    )
    .join('');
  return `<section class="photo-spots"><p class="section-title">Photo spots de hoy</p><ul>${items}</ul></section>`;
}

function renderCollectionItems(items) {
  if (items.length === 0) {
    return '';
  }
  const rendered = items
    .map(
      (item) => `
        <li>
          <p class="item-name">${item.name}</p>
          ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
        </li>
      `
    )
    .join('');
  return `<section class="collection-items"><p class="section-title">Para hoy también</p><ul>${rendered}</ul></section>`;
}

/**
 * Agrupa las Memorias ya guardadas de un capítulo: por actividad (para transformar
 * la invitación correspondiente en su lugar) y las generales (sin actividad, del
 * espacio libre al final del capítulo). Las archivadas nunca se muestran acá.
 */
function groupMemoriesByActivity(memories) {
  const byActivityId = new Map();
  const general = [];
  for (const memory of memories) {
    if (memory.archived) {
      continue;
    }
    if (memory.activityId) {
      const list = byActivityId.get(memory.activityId) ?? [];
      list.push(memory);
      byActivityId.set(memory.activityId, list);
    } else {
      general.push(memory);
    }
  }
  return { byActivityId, general };
}

/**
 * El espacio libre al final del capítulo (E-3): los recuerdos sugeridos sin
 * actividad asociada (como texto de contexto), lo que ya se guardó ahí, y una
 * única invitación abierta — nunca varias cosas compitiendo entre sí.
 * Solo existe si `interactive` es true.
 */
function renderGeneralMemories({ chapterId, unassignedSuggestedMemories, generalMemories, interactive, photoUrls, staged }) {
  if (!interactive) {
    return '';
  }
  const hints = unassignedSuggestedMemories.map((memory) => `<p class="memory-invitation-hint">${memory.prompt}</p>`).join('');
  const saved = generalMemories.map((memory) => renderSavedMemory(memory, photoUrls)).join('');
  const invitation = renderMemoryInvitation({
    chapterId,
    activityId: null,
    question: '¿Algo más de hoy que quieras guardar?',
    staged,
  });

  return `
    <section class="chapter-memories-general">
      <p class="section-title">Algo más de hoy</p>
      ${hints}
      ${saved}
      ${invitation}
    </section>
  `;
}

/** Una tarjeta de recuerdo, de solo lectura — para "Tus recuerdos" y el Álbum del viaje (Épica 3). */
function renderMemoryCard(memory, photoUrls) {
  return `
    <li class="memory-card">
      ${memory.favorite ? '<span class="memory-card-favorite">♥</span>' : ''}
      ${renderMemoryPhotos(memory, photoUrls)}
      ${memory.note ? `<p class="memory-card-note">${memory.note}</p>` : ''}
    </li>
  `;
}

function byCreatedAt(a, b) {
  return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
}

/**
 * "Tus recuerdos" (Épica 3): un recorrido cálido de lo ya guardado en el capítulo
 * (fotos, nota, favoritos) — de solo lectura, no una galería técnica. Igual que en
 * la invitación de cada actividad, si hay varias Memorias para la misma actividad
 * solo se muestra la más reciente (una Memoria activa por actividad, no un historial).
 * Si todavía no hay nada, no se muestra (nunca se resalta una ausencia).
 */
function renderChapterAlbum(memories, photoUrls, interactive) {
  if (!interactive) {
    return '';
  }
  const { byActivityId, general } = groupMemoriesByActivity(memories);
  const perActivity = [...byActivityId.values()].map(mostRecent).filter(Boolean);
  const visible = [...perActivity, ...general];
  if (visible.length === 0) {
    return '';
  }
  const cards = visible
    .sort(byCreatedAt)
    .map((memory) => renderMemoryCard(memory, photoUrls))
    .join('');
  return `<section class="chapter-album"><p class="section-title">Tus recuerdos</p><ul class="memory-cards">${cards}</ul></section>`;
}

/** Una invitación quieta a ver el viaje completo — nunca compite con el momento actual. */
function renderAlbumLink(interactive) {
  if (!interactive) {
    return '';
  }
  return '<p class="album-link"><button type="button" data-action="open-album">Ver el álbum del viaje</button></p>';
}

/** El ritual de apertura de un capítulo (E-2): color propio, título, pausa, frase de apertura. */
const HERO_PALETTE = ['hero-amber', 'hero-clay', 'hero-moss', 'hero-dusk'];

function heroClassForChapter(chapter) {
  const index = ((chapter.order ?? 1) - 1) % HERO_PALETTE.length;
  return HERO_PALETTE[index];
}

function renderChapterHero(chapter, openLine) {
  return `
    <div class="chapter-hero ${heroClassForChapter(chapter)}">
      <h1 class="reveal reveal-1">${chapter.title}</h1>
      <p class="open reveal reveal-2">${openLine}</p>
    </div>
  `;
}

/** El número, no la frase, es protagonista (concepto original recuperado): nunca "Faltan X días". */
function renderCountdown(nextUnlock, now) {
  if (!nextUnlock) {
    return '';
  }
  const days = Math.max(0, Math.ceil((nextUnlock.date.getTime() - now.getTime()) / DAY_IN_MS));
  if (days === 0) {
    return '<p class="countdown-today reveal reveal-4">Hoy comienza.</p>';
  }
  return `
    <div class="countdown-hero reveal reveal-4">
      <span class="countdown-number">${days}</span>
      <span class="countdown-label">${days === 1 ? 'día' : 'días'}</span>
    </div>
  `;
}

// Profundidad simulada por capas (E-refino cinematográfico): cada capa
// correlaciona tamaño, velocidad, opacidad y nitidez — lejos es chico, lento,
// tenue y difuso; cerca es grande, rápido, más presente y nítido. Nunca es la
// misma partícula "escalada", son series propias por capa.
const PARTICLE_DEPTH = {
  far: { opacity: 0.5, blur: 0.9 },
  mid: { opacity: 1, blur: 0.15 },
  near: { opacity: 1.3, blur: 0 },
};

const INTRO_PARTICLES = [
  // far: chicas, lentas, apenas visibles — el fondo del aire
  ...[
    [6, 1.3, 66, 40, -6],
    [19, 1.5, 72, 12, 10],
    [33, 1.2, 60, 55, -9],
    [48, 1.4, 68, 5, 7],
    [62, 1.3, 74, 30, -11],
    [77, 1.5, 63, 20, 9],
    [91, 1.2, 70, 45, -7],
  ].map((p) => [...p, 'far']),
  // mid: el grueso original, ritmo intermedio
  ...[
    [10, 2.2, 40, 18, -10],
    [24, 2.7, 44, 6, 12],
    [38, 2.1, 38, 33, -14],
    [52, 2.8, 46, 24, 9],
    [65, 2, 36, 10, -8],
    [80, 2.6, 42, 37, 13],
    [94, 2.3, 39, 3, -12],
  ].map((p) => [...p, 'mid']),
  // near: pocas, grandes y rápidas — las que "pasan cerca de cámara"
  ...[
    [15, 3.6, 24, 8, -15],
    [42, 4, 27, 20, 16],
    [70, 3.4, 22, 3, -13],
    [88, 3.8, 26, 14, 14],
  ].map((p) => [...p, 'near']),
];

const INTRO_GLINTS = [
  ...[
    [14, 22, 1.3, 8.5, 1.0],
    [52, 76, 1.2, 9.2, 5.5],
    [81, 15, 1.4, 8.8, 3.0],
    [27, 60, 1.3, 9.5, 6.8],
  ].map((p) => [...p, 'far']),
  ...[
    [38, 30, 2.0, 5.4, 2.0],
    [66, 58, 2.2, 5.8, 0.5],
    [90, 40, 1.9, 6.1, 4.2],
    [8, 68, 2.1, 5.6, 3.3],
  ].map((p) => [...p, 'near']),
];

function renderIntroParticles(extraClass = '') {
  const risingParticles = INTRO_PARTICLES.map(([left, size, duration, delay, drift, depth]) => {
    const { opacity, blur } = PARTICLE_DEPTH[depth];
    return `<span class="intro-particle intro-particle-rise" style="--p-left:${left}%;--p-size:${size}px;--p-duration:${duration}s;--p-delay:-${delay}s;--p-drift:${drift}px;--p-opacity:${opacity};--p-blur:${blur}px"></span>`;
  }).join('');
  const glintParticles = INTRO_GLINTS.map(([left, top, size, duration, delay, depth]) => {
    const { opacity, blur } = PARTICLE_DEPTH[depth];
    return `<span class="intro-particle intro-particle-glint" style="--p-left:${left}%;--p-top:${top}%;--p-size:${size}px;--p-duration:${duration}s;--p-delay:-${delay}s;--p-opacity:${opacity};--p-blur:${blur}px"></span>`;
  }).join('');
  return `<div class="intro-particles ${extraClass}" aria-hidden="true">${risingParticles}${glintParticles}</div>`;
}

function renderCoverContent(view, storyPackage, now) {
  const { metadata, baseCopy } = storyPackage;
  return `
    <div class="cover-content">
      <div class="cover-header">
        <p class="eyebrow cover-eyebrow reveal reveal-1">${metadata.destination}</p>
        <h1 class="cover-title reveal reveal-2">${metadata.title}</h1>
        ${renderTravelLine(metadata.origin, metadata.destination)}
      </div>
      <p class="cover-promise reveal reveal-3">${baseCopy.welcomeMessage}</p>
      <div class="cover-countdown-group">
        ${renderCountdown(view.nextUnlock, now)}
        <span class="cover-divider reveal reveal-5" aria-hidden="true"></span>
      </div>
    </div>
  `;
}

function renderStaticCover(view, storyPackage, now) {
  return `
    <section class="book-page cover">
      <img class="cover-photo" src="/cover-hero.jpg" alt="" />
      <div class="cover-tint" aria-hidden="true"></div>
      <div class="cover-scrim" aria-hidden="true"></div>
      ${renderCoverContent(view, storyPackage, now)}
    </section>
  `;
}

function renderReplayIntroButton() {
  return `
    <button type="button" class="intro-replay-button" data-action="replay-intro" aria-label="Repetir intro">
      ↻
    </button>
  `;
}

/**
 * Aurora en pre-viaje usa el video real como primera parte de la portada: el
 * navegador solo continúa desde el último frame hacia el índice, sin máscaras CSS.
 */
function renderIntroVideo(view, storyPackage, now) {
  return `
    <div class="intro-video-shell" aria-label="Introducción de Aurora">
      <video
        class="intro-video"
        src="/video_intro_2.mp4"
        muted
        autoplay
        playsinline
        preload="auto"
        data-aurora-intro-video
      ></video>
      <div class="cover-tint" aria-hidden="true"></div>
      <div class="cover-scrim" aria-hidden="true"></div>
      ${renderCoverContent(view, storyPackage, now)}
      <div class="intro-dark-overlay" aria-hidden="true"></div>
      ${renderIntroParticles()}
    </div>
  `;
}

function renderIntroIndexStage(view, storyPackage, now, coverIntroState) {
  const stateClass = {
    video: 'is-video-running',
    revealing: 'is-index-writing',
    done: 'is-index-done',
  }[coverIntroState] ?? 'is-index-done';
  return `
    <div class="cover-index-stage ${stateClass}">
      ${renderIndexPage(view, storyPackage, {
        pendingReveal: coverIntroState !== 'done',
        revealing: coverIntroState === 'revealing',
        extraClass: 'page-index-ritual',
        showParticles: true,
      })}
      ${coverIntroState === 'video' ? renderIntroVideo(view, storyPackage, now) : ''}
      ${coverIntroState === 'done' ? renderReplayIntroButton() : ''}
    </div>
  `;
}

function renderPreTrip(view, storyPackage, now, coverIntroState) {
  if (coverIntroState === 'video' || coverIntroState === 'revealing' || coverIntroState === 'done') {
    return renderIntroIndexStage(view, storyPackage, now, coverIntroState);
  }

  return `
    <div class="book book-pretrip">
      ${renderReplayIntroButton()}
      ${renderStaticCover(view, storyPackage, now)}
      ${renderIndexPage(view, storyPackage)}
    </div>
  `;
}

function renderInProgress(view, storyPackage, interactive, memories, confirmingClose, photoUrls, stagedPhotosBySlot) {
  const chapter = view.visibleChapter;

  if (!chapter) {
    // Ya se cerró un capítulo y el siguiente todavía no amanece — nunca vacío,
    // nunca revela el día siguiente (E-4).
    return `
      <div class="book">
        <section class="book-page page-chapter page-closing">
          ${renderClosingMessage(view, storyPackage)}
        </section>
        ${renderIndexPage(view, storyPackage)}
      </div>
    `;
  }

  const openLine = chapter.copy?.open ?? storyPackage.baseCopy.dailyOpenTemplate;
  const content = resolveChapterContent(storyPackage, chapter);
  const { byActivityId, general } = groupMemoriesByActivity(memories);

  const activities = content.activitiesWithPlaces
    .map((entry) => renderActivityCard(entry, chapter.id, byActivityId, interactive, photoUrls, stagedPhotosBySlot))
    .join('');
  const generalStaged = stagedPhotosBySlot.get(photoSlotKey(chapter.id, null)) ?? [];

  return `
    <div class="book">
      <section class="book-page page-chapter">
        <div class="chapter">
          ${renderChapterHero(chapter, openLine)}
          <ul class="activities">${activities}</ul>
          ${renderRelatedPlaces(content.relatedPlaces)}
          ${renderPhotoSpots(content.photoSpots)}
          ${renderCollectionItems(content.collectionItems)}
          ${renderChapterAlbum(memories, photoUrls, interactive)}
          ${renderGeneralMemories({
            chapterId: chapter.id,
            unassignedSuggestedMemories: content.unassignedSuggestedMemories,
            generalMemories: general,
            interactive,
            photoUrls,
            staged: generalStaged,
          })}
          ${renderActionButton(chapter.id, chapter.status, interactive, { confirmingClose })}
        </div>
        ${renderAlbumLink(interactive)}
      </section>
      ${renderIndexPage(view, storyPackage)}
    </div>
  `;
}

/** Si un prompt fue pensado originalmente contra una foto — decide si intenta ofrecer una real (Épica 3). */
function isPhotoPrompt(prompt) {
  return prompt.memoryType === 'photo' || prompt.sourceCategory === 'photo';
}

/**
 * Un prompt del epílogo todavía sin responder, degradado con gracia a palabras — el
 * refugio final cuando no hay ninguna foto real compatible todavía (Épica 3) o para
 * los prompts que nunca fueron sobre una foto. Nunca promete una subida que no existe.
 */
function renderTextPrompt(prompt, chapterId) {
  const question = prompt.creationPrompt ?? prompt.selectionPrompt ?? '';
  return `
    <div class="memory-slot memory-slot-invitation">
      <p class="section-title">${prompt.label}</p>
      <p class="memory-invitation-question">${question}</p>
      ${isPhotoPrompt(prompt) ? '<p class="memory-invitation-hint">Por ahora, esto se guarda con tus palabras.</p>' : ''}
      <textarea class="memory-note-input" placeholder="Escribí algo que quieras recordar..."></textarea>
      <button type="button" data-action="create-memory" data-chapter-id="${chapterId}" data-activity-id="${prompt.id}">Guardar este recuerdo</button>
    </div>
  `;
}

/** Un prompt retrospectivo sobre un lugar real (restaurante/cafetería): selección, no texto libre. */
function renderPlacePrompt(prompt, chapterId, storyPackage) {
  const catalog = storyPackage.placesCatalog ?? {};
  const places = prompt.sourceCategory === 'cafes' ? catalog.cafes ?? [] : catalog.restaurants ?? [];
  if (places.length === 0) {
    return renderTextPrompt(prompt, chapterId);
  }
  const options = places.map((place) => `<option value="${place.name}">${place.name}</option>`).join('');
  return `
    <div class="memory-slot memory-slot-invitation">
      <p class="section-title">${prompt.label}</p>
      <p class="memory-invitation-question">${prompt.selectionPrompt ?? ''}</p>
      <select class="memory-place-select">${options}</select>
      <button type="button" data-action="select-place" data-chapter-id="${chapterId}" data-activity-id="${prompt.id}">Guardar esta elección</button>
    </div>
  `;
}

/**
 * Un prompt pensado para foto ahora elige de verdad entre las fotos ya capturadas
 * durante el viaje (Épica 3) — nunca duplica el archivo, solo referencia su id.
 * Si todavía no existe ninguna foto real, degrada con elegancia al texto — nunca
 * un mensaje de error.
 */
function renderPhotoSelectionPrompt(prompt, chapterId, availableTripPhotos, photoUrls) {
  if (availableTripPhotos.length === 0) {
    return renderTextPrompt(prompt, chapterId);
  }
  const question = prompt.selectionPrompt ?? prompt.creationPrompt ?? '';
  const options = availableTripPhotos
    .map(
      (photoId) => `
        <button type="button" class="photo-pick-option" data-action="select-epilogue-photo" data-chapter-id="${chapterId}" data-activity-id="${prompt.id}" data-photo-id="${photoId}">
          ${photoUrls[photoId] ? `<img src="${photoUrls[photoId]}" alt="" />` : ''}
        </button>
      `
    )
    .join('');
  return `
    <div class="memory-slot memory-slot-invitation">
      <p class="section-title">${prompt.label}</p>
      <p class="memory-invitation-question">${question}</p>
      <div class="photo-pick-grid">${options}</div>
    </div>
  `;
}

/**
 * Cada prompt del epílogo se identifica con su propio `prompt.id`, guardado como
 * `activityId` de la Memoria (Memory Engine no valida ese campo contra nada — es
 * un string libre). Esto permite reusar `groupMemoriesByActivity`/`renderSavedMemory`
 * tal cual, sin tocar Memory Engine.
 */
function renderPromptSlot(prompt, chapterId, existingMemory, storyPackage, photoUrls, availableTripPhotos) {
  if (existingMemory) {
    return `<div class="prompt-answered"><p class="section-title">${prompt.label}</p>${renderSavedMemory(existingMemory, photoUrls)}</div>`;
  }
  if (prompt.type === 'retrospective' && prompt.retrospectiveSource === 'place') {
    return renderPlacePrompt(prompt, chapterId, storyPackage);
  }
  if (isPhotoPrompt(prompt)) {
    return renderPhotoSelectionPrompt(prompt, chapterId, availableTripPhotos, photoUrls);
  }
  return renderTextPrompt(prompt, chapterId);
}

function renderEpilogue(view, storyPackage, interactive, memories, confirmingClose, photoUrls, availableTripPhotos) {
  const specialChapter = storyPackage.specialChapter;

  if (view.specialChapterStatus === ChapterStatus.LOCKED) {
    const date = formatChapterDate(getChapterReferenceDate(specialChapter, storyPackage));
    return `
      <div class="book">
        <section class="book-page page-epilogue epilogue-waiting">
          <p class="eyebrow">${date}</p>
          <p class="open">Nos espera.</p>
        </section>
        ${renderIndexPage(view, storyPackage)}
      </div>
    `;
  }

  const { byActivityId } = groupMemoriesByActivity(memories);
  const prompts = !interactive
    ? ''
    : (specialChapter.prompts ?? [])
        .map((prompt) => {
          const existing = mostRecent(byActivityId.get(prompt.id));
          return `<li>${renderPromptSlot(prompt, specialChapter.id, existing, storyPackage, photoUrls, availableTripPhotos)}</li>`;
        })
        .join('');

  return `
    <div class="book">
      <section class="book-page page-epilogue">
        <h1 class="reveal reveal-1">${specialChapter.title}</h1>
        <p class="open reveal reveal-2">${specialChapter.copy?.open ?? ''}</p>
        <ul class="prompts">${prompts}</ul>
        ${renderActionButton(specialChapter.id, view.specialChapterStatus, interactive, {
          confirmingClose,
          confirmQuestion: 'Esto va a cerrar el viaje. ¿Querés guardarlo así, tal como fue?',
          confirmLabel: 'Sí, guardar así',
          cancelLabel: 'Seguir un poco más',
        })}
        ${renderAlbumLink(interactive)}
      </section>
      ${renderIndexPage(view, storyPackage)}
    </div>
  `;
}

/** La primera pantalla de Memory Mode (E-6): si se acaba de transformar, una línea breve lo acompaña — una única vez, nunca anunciada de antemano. */
function renderMemoryMode(view, storyPackage, justTransformed, interactive) {
  const content = justTransformed
    ? `
      <p class="transformation-line reveal reveal-1">Esta historia se convirtió en un recuerdo.</p>
      <p class="eyebrow reveal reveal-2">${storyPackage.metadata.title}</p>
      <p class="letter reveal reveal-3">${storyPackage.baseCopy.finalLetter ?? ''}</p>
    `
    : `
      <p class="eyebrow reveal reveal-1">${storyPackage.metadata.title}</p>
      <p class="letter reveal reveal-2">${storyPackage.baseCopy.finalLetter ?? ''}</p>
    `;
  return `
    <div class="book">
      <section class="book-page page-memory">
        ${content}
        ${renderAlbumLink(interactive)}
      </section>
      ${renderIndexPage(view, storyPackage)}
    </div>
  `;
}

/**
 * El álbum completo del viaje (Épica 3): los recuerdos agrupados por capítulo, en
 * orden narrativo — no es Memory Mode, es simplemente poder verlos todos juntos.
 * Solo se muestran los capítulos que ya tienen algo — nunca se resalta una ausencia.
 */
function renderTripAlbum(storyPackage, tripMemories, photoUrls) {
  const allChapters = [...storyPackage.chapters, ...(storyPackage.specialChapter ? [storyPackage.specialChapter] : [])];
  const byChapter = new Map();
  for (const memory of tripMemories) {
    if (memory.archived) {
      continue;
    }
    const list = byChapter.get(memory.chapterId) ?? [];
    list.push(memory);
    byChapter.set(memory.chapterId, list);
  }

  const sections = allChapters
    .filter((chapter) => (byChapter.get(chapter.id) ?? []).length > 0)
    .map((chapter) => {
      const { byActivityId, general } = groupMemoriesByActivity(byChapter.get(chapter.id));
      const perActivity = [...byActivityId.values()].map(mostRecent).filter(Boolean);
      const cards = [...perActivity, ...general]
        .sort(byCreatedAt)
        .map((memory) => renderMemoryCard(memory, photoUrls))
        .join('');
      return `<section class="album-chapter"><p class="section-title">${chapter.title}</p><ul class="memory-cards">${cards}</ul></section>`;
    })
    .join('');

  return `
    <div class="book">
      <section class="book-page page-album">
        <p class="eyebrow reveal reveal-1">${storyPackage.metadata.title}</p>
        <h1 class="reveal reveal-2">Tu álbum del viaje</h1>
        ${sections || '<p class="album-empty">El álbum espera sus primeros recuerdos.</p>'}
        <p class="album-back"><button type="button" data-action="close-album">Volver</button></p>
      </section>
    </div>
  `;
}

/**
 * @param {object} view - Resultado de getStoryView.
 * @param {object} storyPackage - Story Package ya validado.
 * @param {Date} now - Momento a usar para cálculos de presentación (ej. cuenta regresiva).
 * @param {object} [options]
 * @param {boolean} [options.interactive=true] - Si es false, no se renderiza ningún botón de
 *   acción ni la sección de Memorias (usado durante los escenarios de desarrollo, de solo lectura).
 * @param {object[]} [options.memories=[]] - Memorias ya cargadas del capítulo visible. `render.js`
 *   nunca llama a memoryStore.js directamente — las recibe siempre resueltas.
 * @param {boolean} [options.confirmingClose=false] - Si se está mostrando la confirmación cálida
 *   antes de cerrar el capítulo o el epílogo visible (E-4/E-6).
 * @param {boolean} [options.justTransformed=false] - Si la historia se acaba de convertir en
 *   un recuerdo (E-6): una línea breve que solo aparece una vez, nunca anunciada de antemano.
 * @param {object} [options.photoUrls={}] - Mapa id de foto → object URL, ya resuelto desde
 *   IndexedDB (Épica 3). `render.js` nunca toca `photoStore.js` directamente.
 * @param {Map} [options.stagedPhotosBySlot] - Fotos elegidas pero todavía sin guardar, por
 *   `photoSlotKey` (Épica 3) — estado efímero, vive en `experienceView.js`.
 * @param {string[]} [options.availableTripPhotos=[]] - Ids de fotos ya capturadas en el viaje,
 *   para que los prompts de foto del epílogo puedan elegir una real (Épica 3).
 * @param {boolean} [options.showingTripAlbum=false] - Si se está mostrando el Álbum del viaje
 *   en vez de la vista normal del `currentMode` (Épica 3).
 * @param {object[]} [options.tripMemories=[]] - Todas las Memorias del viaje (todas las
 *   historias), ya resueltas, para el Álbum del viaje.
 * @param {object|null} [options.installBanner=null] - `{platform: 'ios'|'android'}` si
 *   corresponde invitar a instalar Aurora ahora, o `null` (Épica 4).
 * @param {object|null} [options.pendingNotification=null] - Notificación significativa de
 *   hoy todavía sin permiso mostrado, o `null` (Épica 4). Ver `notifications.js`.
 * @param {'video'|'revealing'|'done'} [options.coverIntroState='done'] - Estado visual de
 *   la intro de video→índice. `render.js` no maneja tiempos; solo pinta el estado recibido.
 * @returns {string} HTML listo para inyectar.
 */
export function renderExperience(view, storyPackage, now, options = {}) {
  const interactive = options.interactive ?? true;
  const memories = options.memories ?? [];
  const confirmingClose = options.confirmingClose ?? false;
  const justTransformed = options.justTransformed ?? false;
  const photoUrls = options.photoUrls ?? {};
  const stagedPhotosBySlot = options.stagedPhotosBySlot ?? new Map();
  const availableTripPhotos = options.availableTripPhotos ?? [];
  const showingTripAlbum = options.showingTripAlbum ?? false;
  const tripMemories = options.tripMemories ?? [];
  const installBanner = interactive ? options.installBanner ?? null : null;
  const pendingNotification = interactive ? options.pendingNotification ?? null : null;
  const coverIntroState = options.coverIntroState ?? 'done';

  const banners = `${renderInstallBanner(installBanner)}${renderNotificationPrompt(pendingNotification)}`;

  if (showingTripAlbum) {
    return banners + renderTripAlbum(storyPackage, tripMemories, photoUrls);
  }

  switch (view.currentMode) {
    case StoryMode.PRE_TRIP:
      return banners + renderPreTrip(view, storyPackage, now, coverIntroState);
    case StoryMode.IN_PROGRESS:
      return banners + renderInProgress(view, storyPackage, interactive, memories, confirmingClose, photoUrls, stagedPhotosBySlot);
    case StoryMode.EPILOGUE:
      return banners + renderEpilogue(view, storyPackage, interactive, memories, confirmingClose, photoUrls, availableTripPhotos);
    case StoryMode.MEMORY_MODE:
      return banners + renderMemoryMode(view, storyPackage, justTransformed, interactive);
    default:
      throw new Error(`currentMode desconocido: ${view.currentMode}`);
  }
}
