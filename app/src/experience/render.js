// Traduce un StoryView + Story Package a HTML (string). Función pura: mismo input,
// mismo output siempre. No toca `document`, no lee el reloj — `now` se recibe como
// parámetro para poder calcular la cuenta regresiva de pre_trip sin dejar de ser pura.
// Ver IMPLEMENTATION_PHASE_4.md.

import { StoryMode } from '../story/storyEngine/storyEngine.js';
import { ChapterStatus } from '../story/storyProgress/storyProgress.js';
import { resolveChapterContent } from './chapterContent.js';

const STATUS_LABEL = {
  [ChapterStatus.LOCKED]: 'Todavía no',
  [ChapterStatus.AVAILABLE]: 'Hoy',
  [ChapterStatus.STARTED]: 'En curso',
  [ChapterStatus.COMPLETED]: 'Vivido',
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

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
    return { id: chapter.id, title: chapter.title, status };
  });
}

function renderChapterList(view, storyPackage, extraClass = '') {
  const items = buildChapterSummary(view, storyPackage)
    .map(({ title, status }) => `<li><span class="chapter-status">${STATUS_LABEL[status]}</span> ${title}</li>`)
    .join('');
  return `<ul class="chapter-list ${extraClass}">${items}</ul>`;
}

function renderActionButton(chapterId, status, interactive) {
  if (!interactive) {
    return '';
  }
  if (status === ChapterStatus.AVAILABLE) {
    return `<div class="actions"><button type="button" data-action="start" data-chapter-id="${chapterId}">Marcar como iniciado</button></div>`;
  }
  if (status === ChapterStatus.STARTED) {
    return `<div class="actions"><button type="button" data-action="complete" data-chapter-id="${chapterId}">Cerrar capítulo</button></div>`;
  }
  return '';
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

/** Un recuerdo ya guardado, mostrado en el mismo lugar donde antes estaba la invitación (E-3). */
function renderSavedMemory(memory) {
  return `
    <div class="memory-slot memory-slot-saved">
      <p class="memory-note">${memory.note}</p>
      <div class="memory-actions">
        <button type="button" data-action="favorite-memory" data-memory-id="${memory.id}">
          ${memory.favorite ? '♥ Recuerdo favorito' : '♥ Marcar como favorito'}
        </button>
        <button type="button" data-action="archive-memory" data-memory-id="${memory.id}">Guardar aparte</button>
      </div>
    </div>
  `;
}

/** Una invitación abierta a guardar un recuerdo — nunca una instrucción. */
function renderMemoryInvitation({ chapterId, activityId, question, hint }) {
  return `
    <div class="memory-slot memory-slot-invitation">
      <p class="memory-invitation-question">${question}</p>
      ${hint ? `<p class="memory-invitation-hint">${hint}</p>` : ''}
      <textarea class="memory-note-input" placeholder="Escribí algo que quieras recordar..."></textarea>
      <button type="button" data-action="create-memory" data-chapter-id="${chapterId}" data-activity-id="${activityId ?? ''}">Guardar este recuerdo</button>
    </div>
  `;
}

function renderActivityMemorySlot({ chapterId, activity, suggestedMemories, existingMemory, interactive }) {
  if (!interactive) {
    return '';
  }
  if (existingMemory) {
    return renderSavedMemory(existingMemory);
  }
  if (suggestedMemories.length === 0) {
    return '';
  }
  return renderMemoryInvitation({
    chapterId,
    activityId: activity.id,
    question: '¿Hay algo de esto que quieras guardar?',
    hint: suggestedMemories.map((memory) => memory.prompt).join(' · '),
  });
}

function renderActivityCard({ activity, place, suggestedMemories }, chapterId, memoriesByActivityId, interactive) {
  const location = resolveLocation(activity, place);
  const websiteUrl = resolveWebsiteUrl(activity, place);
  const existingMemory = mostRecent(memoriesByActivityId.get(activity.id));

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
      ${renderActivityMemorySlot({ chapterId, activity, suggestedMemories, existingMemory, interactive })}
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
function renderGeneralMemories({ chapterId, unassignedSuggestedMemories, generalMemories, interactive }) {
  if (!interactive) {
    return '';
  }
  const hints = unassignedSuggestedMemories.map((memory) => `<p class="memory-invitation-hint">${memory.prompt}</p>`).join('');
  const saved = generalMemories.map(renderSavedMemory).join('');
  const invitation = renderMemoryInvitation({
    chapterId,
    activityId: null,
    question: '¿Algo más de hoy que quieras guardar?',
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

function renderCountdown(nextUnlock, now) {
  if (!nextUnlock) {
    return '';
  }
  const days = Math.max(0, Math.ceil((nextUnlock.date.getTime() - now.getTime()) / DAY_IN_MS));
  if (days === 0) {
    return '<p class="countdown reveal reveal-4">Hoy comienza.</p>';
  }
  const label = days === 1 ? 'Falta 1 día.' : `Faltan ${days} días.`;
  return `<p class="countdown reveal reveal-4">${label}</p>`;
}

function renderPreTrip(view, storyPackage, now) {
  return `
    <section class="pre-trip">
      <p class="eyebrow reveal reveal-1">${storyPackage.metadata.destination}</p>
      <h1 class="reveal reveal-2">${storyPackage.metadata.title}</h1>
      <p class="welcome reveal reveal-3">${storyPackage.baseCopy.welcomeMessage}</p>
      ${renderCountdown(view.nextUnlock, now)}
      ${renderChapterList(view, storyPackage, 'reveal reveal-5')}
    </section>
  `;
}

function renderInProgress(view, storyPackage, interactive, memories) {
  const chapter = view.visibleChapter;
  const openLine = chapter?.copy?.open ?? storyPackage.baseCopy.dailyOpenTemplate;
  const content = chapter ? resolveChapterContent(storyPackage, chapter) : null;
  const { byActivityId, general } = groupMemoriesByActivity(memories);

  const activities = content
    ? content.activitiesWithPlaces
        .map((entry) => renderActivityCard(entry, chapter.id, byActivityId, interactive))
        .join('')
    : '';

  return `
    <section class="chapter">
      ${chapter ? renderChapterHero(chapter, openLine) : ''}
      <ul class="activities">${activities}</ul>
      ${content ? renderRelatedPlaces(content.relatedPlaces) : ''}
      ${content ? renderPhotoSpots(content.photoSpots) : ''}
      ${content ? renderCollectionItems(content.collectionItems) : ''}
      ${
        chapter
          ? renderGeneralMemories({
              chapterId: chapter.id,
              unassignedSuggestedMemories: content.unassignedSuggestedMemories,
              generalMemories: general,
              interactive,
            })
          : ''
      }
      ${renderActionButton(chapter?.id, chapter?.status, interactive)}
    </section>
    ${renderChapterList(view, storyPackage)}
  `;
}

function renderEpilogue(view, storyPackage, interactive) {
  const specialChapter = storyPackage.specialChapter;

  if (view.specialChapterStatus === ChapterStatus.LOCKED) {
    return `
      <section class="epilogue epilogue-waiting">
        <p class="open">Todavía no. Este capítulo espera su momento.</p>
      </section>
    `;
  }

  const prompts = (specialChapter.prompts ?? [])
    .map((prompt) => `<li><strong>${prompt.label}</strong> — ${prompt.selectionPrompt ?? prompt.creationPrompt}</li>`)
    .join('');

  return `
    <section class="epilogue">
      <h1>${specialChapter.title}</h1>
      <p class="open">${specialChapter.copy?.open ?? ''}</p>
      <ul class="prompts">${prompts}</ul>
      ${renderActionButton(specialChapter.id, view.specialChapterStatus, interactive)}
    </section>
  `;
}

function renderMemoryMode(storyPackage) {
  return `
    <section class="memory">
      <p class="eyebrow">${storyPackage.metadata.title}</p>
      <p class="letter">${storyPackage.baseCopy.finalLetter ?? ''}</p>
    </section>
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
 * @returns {string} HTML listo para inyectar.
 */
export function renderExperience(view, storyPackage, now, options = {}) {
  const interactive = options.interactive ?? true;
  const memories = options.memories ?? [];

  switch (view.currentMode) {
    case StoryMode.PRE_TRIP:
      return renderPreTrip(view, storyPackage, now);
    case StoryMode.IN_PROGRESS:
      return renderInProgress(view, storyPackage, interactive, memories);
    case StoryMode.EPILOGUE:
      return renderEpilogue(view, storyPackage, interactive);
    case StoryMode.MEMORY_MODE:
      return renderMemoryMode(storyPackage);
    default:
      throw new Error(`currentMode desconocido: ${view.currentMode}`);
  }
}
