// Único archivo de esta carpeta que toca `document`: carga el Story Package real,
// ejecuta el motor, maneja las acciones del usuario y pinta el resultado de render.js.
// Ver README.md.

import rawStoryPackage from '../story/data/story-ba2026.json';
import { loadStoryPackage } from '../story/storyPackage/storyPackage.js';
import { getStoryView, StoryMode } from '../story/storyEngine/storyEngine.js';
import { loadProgress, markChapterStarted, markChapterCompleted } from '../story/progressStore/progressStore.js';
import { loadMemories, createNoteMemory, toggleFavorite, archiveMemory } from '../memory/memoryStore.js';
import { savePhotoBlob, loadPhotoBlob } from '../memory/photoStore.js';
import { renderExperience, photoSlotKey } from './render.js';
import { resolveSignificantNotification } from './notifications.js';
import { extractTokenFromUrl, saveSyncToken, syncNow } from '../sync/syncClient.js';
import { isDirectorModeEnabled, DIRECTOR_STAGES, findDirectorStage, renderDirectorPanel } from './directorMode.js';
import { getMemories as loadChecklistMemories, upsertMemory as upsertChecklistMemory } from '../storage.js';
// Módulo virtual de vite-plugin-pwa (Épica 4). Bajo `npm run dev` sin
// `devOptions.enabled` resuelve a una función que no hace nada — el Service
// Worker real solo existe en un build de producción (`npm run build`).
// Se registra ÚNICAMENTE acá: main.js, debug.html y memories.html nunca lo
// importan, así que visitarlos jamás activa el Service Worker de Aurora.
import { registerSW } from 'virtual:pwa-register';

const storyPackage = loadStoryPackage(rawStoryPackage);
const appEl = document.getElementById('app');

registerSW({ immediate: true });

// ---- Persistencia real (Épica 5) ----
// El link/QR de Aurora Studio trae `?token=...`. Se guarda una sola vez (no
// hace falta seguir cargando la URL con el token en cada visita) y se limpia
// de la barra de direcciones — nunca queda pegado en el historial ni en un
// posible link reenviado sin querer.
{
  const tokenFromUrl = extractTokenFromUrl();
  if (tokenFromUrl) {
    saveSyncToken(storyPackage.storyId, tokenFromUrl);
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url);
  }
}

// ============================================================================
// SOLO DESARROLLO — override de fecha/progreso por ?scenario= en la URL.
// No toca Story Engine, el Story Package ni progressStore: solo decide qué
// `context` se le pasa a getStoryView, y es de solo lectura (nunca escribe en
// localStorage). Para quitarlo antes de producción: borrar este bloque completo
// (hasta el cierre marcado más abajo) y borrar el `if (override)` de resolveContext.
const DEV_SCENARIOS = {
  pre_trip: { now: '2026-07-10', chapterStatuses: {} },
  day1: { now: '2026-07-18', chapterStatuses: {} },
  epilogue: {
    now: '2026-07-22',
    chapterStatuses: {
      'chapter-1': 'completed',
      'chapter-2': 'completed',
      'chapter-3': 'completed',
      'chapter-4': 'completed',
    },
  },
  memory: {
    now: '2026-07-22',
    chapterStatuses: {
      'chapter-1': 'completed',
      'chapter-2': 'completed',
      'chapter-3': 'completed',
      'chapter-4': 'completed',
      'chapter-epilogue': 'completed',
    },
  },
};

function getDevOverride() {
  const scenario = new URLSearchParams(window.location.search).get('scenario');
  return DEV_SCENARIOS[scenario] ? { ...DEV_SCENARIOS[scenario], devScenario: scenario } : null;
}
// ============================================================================ fin SOLO DESARROLLO

// ============================================================================
// DIRECTOR MODE (QA) — override de fecha/progreso desde el panel, solo con
// `?director`/`?preview` en la URL (ver directorMode.js). Mismo mecanismo que
// el bloque SOLO DESARROLLO de arriba (now + chapterStatuses), nunca escribe en
// localStorage — es de solo lectura para el motor real.
let directorOverride = null; // {now, chapterStatuses, label} | null
let directorPanelCollapsed = false;
let directorPlaythrough = null; // null | { stageIndex, speed, paused, timerId }
// ============================================================================ fin DIRECTOR MODE

function resolveContext() {
  if (directorOverride) {
    return {
      now: new Date(directorOverride.now),
      chapterStatuses: directorOverride.chapterStatuses,
      devScenario: `director:${directorOverride.label}`,
    };
  }
  const override = getDevOverride();
  if (override) {
    return { now: new Date(override.now), chapterStatuses: override.chapterStatuses, devScenario: override.devScenario };
  }
  return { now: new Date(), chapterStatuses: loadProgress(storyPackage.storyId), devScenario: null };
}

function loadChapterMemories(chapter) {
  if (!chapter) {
    return [];
  }
  return loadMemories(storyPackage.storyId).filter((memory) => memory.chapterId === chapter.id);
}

/** Todos los ids de foto referenciados por una o más listas de Memorias, sin repetir. */
function collectPhotoIds(memoriesLists) {
  const ids = new Set();
  for (const list of memoriesLists) {
    for (const memory of list) {
      for (const id of memory.photos ?? []) {
        ids.add(id);
      }
    }
  }
  return ids;
}

function isRemoteUrl(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value);
}

/**
 * Resuelve cada id de foto a algo pintable. Si ya es una URL remota (Épica 5 —
 * la foto ya se sincronizó a Cloudinary), se usa tal cual; si es un id local
 * todavía sin sincronizar, se resuelve contra IndexedDB como siempre.
 */
async function resolvePhotoUrls(photoIds) {
  const entries = await Promise.all(
    [...photoIds].map(async (id) => {
      if (isRemoteUrl(id)) {
        return [id, id];
      }
      const blob = await loadPhotoBlob(id);
      return blob ? [id, URL.createObjectURL(blob)] : null;
    })
  );
  return Object.fromEntries(entries.filter(Boolean));
}

/** Ids de foto ya capturados en todo el viaje (sin archivadas), para que el epílogo pueda ofrecer una real. */
function tripWidePhotoIds(tripMemories) {
  return [...collectPhotoIds([tripMemories.filter((memory) => !memory.archived)])];
}

// Estado de UI puramente transitorio (E-4/E-6/Épica 3): confirmación cálida antes
// de cerrar, si la historia se acaba de convertir en un recuerdo, si se está
// mostrando el Álbum del viaje, y las fotos elegidas pero todavía sin guardar por
// cajón (`photoSlotKey`). Nada de esto persiste — no hace falta, se resetea solo
// al recargar y no representa ningún dato real de la historia.
let confirmingClose = false;
let justTransformed = false;
let showingTripAlbum = false;
let showingPreparations = false;
let stagedPhotosBySlot = new Map();
let lockedChapterNotice = null;
let preparationRevealObserver = null;

const LOCKED_CHAPTER_MESSAGES = [
  {
    line: 'Algunas historias no se apuran.',
    detail: 'Este capítulo estará disponible el {fecha}.',
  },
  {
    line: 'Aurora todavía guarda algunas sorpresas.',
    detail: 'Este capítulo se abrirá el {fecha}.',
  },
  {
    line: 'Todavía no es tiempo de pasar esta página.',
    detail: 'Vuelve el {fecha}.',
  },
  {
    line: 'La espera también forma parte del viaje.',
    detail: 'Este capítulo estará disponible el {fecha}.',
  },
  {
    line: 'Cada día merece vivirse en su momento.',
    detail: 'Este capítulo se abrirá el {fecha}.',
  },
  {
    line: 'Algunas páginas prefieren esperar.',
    detail: 'La siguiente se abrirá el {fecha}.',
  },
  {
    line: 'No todas las historias quieren contarse de inmediato.',
    detail: 'Este capítulo estará listo el {fecha}.',
  },
  {
    line: 'Hay recuerdos que todavía no existen.',
    detail: 'Este capítulo comenzará el {fecha}.',
  },
  {
    line: 'Los buenos libros también saben esperar.',
    detail: 'La siguiente página llegará el {fecha}.',
  },
  {
    line: 'No adelantes la historia.',
    detail: 'Todavía queda mucho por vivir antes de llegar aquí.',
  },
  {
    line: 'Cada recuerdo llega cuando tiene que llegar.',
    detail: 'Nos vemos el {fecha}.',
  },
  {
    line: 'Buenos Aires todavía guarda algunas sorpresas.',
    detail: 'Este capítulo estará disponible el {fecha}.',
  },
  {
    line: 'La ciudad aún no ha llegado hasta aquí.',
    detail: 'Vuelve el {fecha}.',
  },
  {
    line: 'No hace falta correr.',
    detail: 'Este capítulo se abrirá el {fecha}.',
  },
  {
    line: 'Cada amanecer trae una página nueva.',
    detail: 'La próxima aparecerá el {fecha}.',
  },
];

const LOCKED_CHAPTER_ACTIONS = [
  'Seguir explorando',
  'Volver',
  'Continuar',
  'De acuerdo',
  'Nos vemos pronto',
];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function withUnlockDate(text, unlockLabel) {
  return text.replaceAll('{fecha}', unlockLabel);
}

function chooseLockedChapterNotice(unlockLabel) {
  const message = randomFrom(LOCKED_CHAPTER_MESSAGES);
  return {
    line: withUnlockDate(message.line, unlockLabel),
    detail: withUnlockDate(message.detail, unlockLabel),
    actionLabel: randomFrom(LOCKED_CHAPTER_ACTIONS),
  };
}

// La intro emocional es un evento de sesión, no de historia: ocurre una sola
// vez por sesión del navegador. Mientras corre el video el índice real existe
// como único contenedor oculto; recién se revela cuando termina o entra fallback.
const introSeenKey = `aurora:intro-video-2-seen:${storyPackage.storyId}`;
let coverIntroState = 'idle'; // idle | video | revealing | done
let coverIntroTimers = [];
let shouldFocusIndexAfterRender = false;

// Object URLs de fotos YA guardadas, creados en el último render — se revocan al
// empezar el siguiente para no acumular memoria. Las de fotos EN CURSO (todavía
// sin guardar) tienen un ciclo de vida propio: viven en `stagedPhotosBySlot` y se
// revocan solo cuando se quitan o se guardan, nunca en cada render.
let activeObjectUrls = [];

// ---- Instalación y notificaciones (Épica 4) ----

function isStandaloneDisplay() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

let deferredInstallPrompt = null;
let installDismissed = false;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  renderNow();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installDismissed = true;
  clearTimeout(installRevealTimer);
  renderNow();
});

// La sugerencia de instalar nunca debe sentirse como una interrupción: espera
// a que el ritual de portada termine del todo (`coverIntroState==='done'`,
// nunca durante el video/la escritura de Capítulos) y, encima, una pausa de
// lectura tranquila antes de mostrarse — nunca apenas se cumplen las
// condiciones técnicas de la plataforma.
const INSTALL_PROMPT_DELAY_MS = 6000;
let installEligibleAt = null;
let installRevealTimer = null;

function resolveInstallBanner() {
  if (installDismissed || isStandaloneDisplay() || coverIntroState !== 'done') {
    return null;
  }
  const platform = deferredInstallPrompt ? 'android' : isIOSDevice() ? 'ios' : null;
  if (!platform) {
    return null;
  }
  if (installEligibleAt === null) {
    installEligibleAt = Date.now();
    installRevealTimer = setTimeout(() => {
      installRevealTimer = null;
      renderNow();
    }, INSTALL_PROMPT_DELAY_MS);
    return null;
  }
  if (Date.now() - installEligibleAt < INSTALL_PROMPT_DELAY_MS) {
    return null;
  }
  return { platform };
}

/** Deja ver el fade de salida (`.install-banner.is-dismissing`) antes de que
 * el próximo `renderNow()` reemplace el DOM — la lógica de instalar/descartar
 * que se ejecuta después de este helper no cambia en nada. */
async function dismissInstallBannerWithFade() {
  clearTimeout(installRevealTimer);
  const el = appEl.querySelector('.install-banner');
  if (!el) {
    return;
  }
  el.classList.add('is-dismissing');
  await new Promise((resolve) => setTimeout(resolve, 280));
}

const notifiedKey = `aurora:notified:${storyPackage.storyId}`;
let lastNotifiedKey = null;
let dismissedNotificationKey = null;
let currentPendingNotification = null;

/**
 * Si hoy hay algo significativo y ya hay permiso, muestra la notificación nativa
 * (una sola vez por `key`). Si el permiso todavía no se pidió, deja lista la
 * invitación en pantalla en vez de preguntar sin que la persona haya hecho nada.
 * Nunca se dispara en segundo plano — solo cuando Aurora está abierta (ver
 * notifications.js para la razón).
 */
function resolveNotificationState(view, now) {
  currentPendingNotification = null;
  if (typeof Notification === 'undefined') {
    return;
  }
  const significant = resolveSignificantNotification(view, storyPackage, now);
  if (!significant) {
    return;
  }
  if (Notification.permission === 'granted') {
    if (lastNotifiedKey === null) {
      lastNotifiedKey = window.localStorage.getItem(notifiedKey);
    }
    if (lastNotifiedKey !== significant.key) {
      new Notification(significant.title, { body: significant.body, icon: '/icons/Web/android-chrome-192x192.png' });
      lastNotifiedKey = significant.key;
      window.localStorage.setItem(notifiedKey, significant.key);
    }
  } else if (Notification.permission === 'default' && dismissedNotificationKey !== significant.key) {
    currentPendingNotification = significant;
  }
}

// La "página" que se está mostrando (E-6): portada/capítulo/epílogo/memoria o el
// álbum del viaje. Cambiar de página dispara la transición tipo pasar-página;
// quedarse en la misma (ej. tildar un favorito) nunca la retriggerea.
let lastPageKey = null;

function applyPageTransition(pageKey) {
  const changed = pageKey !== lastPageKey;
  lastPageKey = pageKey;
  if (!changed) {
    return;
  }
  appEl.classList.remove('page-turn');
  void appEl.offsetWidth; // fuerza reflow para poder reiniciar la animación
  appEl.classList.add('page-turn');
}

function clearCoverIntroTimers() {
  coverIntroTimers.forEach(clearTimeout);
  coverIntroTimers = [];
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function updatePreparationProgressDom() {
  const buttons = [...appEl.querySelectorAll('[data-action="toggle-preparation"]')];
  const total = buttons.length;
  const done = buttons.filter((item) => item.dataset.completed === 'true').length;
  const complete = total > 0 && done === total;
  const label = complete ? '✓ Todo listo' : `${done} de ${total} listos`;
  const pct = total ? Math.round((done / total) * 100) : 0;

  for (const progress of appEl.querySelectorAll('[data-preparation-progress]')) {
    progress.setAttribute('aria-label', label);
    const labelEl = progress.querySelector('[data-preparation-progress-label]');
    if (labelEl) {
      labelEl.textContent = label;
    }
    const fill = progress.querySelector('[data-preparation-progress-fill]');
    if (fill) {
      fill.style.width = `${pct}%`;
    }
  }

  appEl.querySelector('[data-preparation-complete-copy]')?.classList.toggle('is-hidden', !complete);
}

function updatePreparationGroupsDom() {
  for (const group of appEl.querySelectorAll('[data-preparation-group]')) {
    const buttons = [...group.querySelectorAll('[data-action="toggle-preparation"]')];
    const total = Number(group.dataset.total) || buttons.length;
    const done = buttons.filter((item) => item.dataset.completed === 'true').length;
    const complete = total > 0 && done === total;
    group.classList.toggle('is-complete', complete);
    const count = group.querySelector('[data-preparation-group-count]');
    if (count) {
      count.textContent = complete ? '✓' : `${done}/${total}`;
    }
  }
}

function updatePreparationToggleDom(button, completed) {
  button.dataset.completed = String(completed);
  button.setAttribute('aria-pressed', String(completed));
  button.classList.toggle('is-complete', completed);
  const mark = button.querySelector('.preparation-check-mark');
  if (mark) {
    mark.textContent = completed ? '✓' : '';
  }
  updatePreparationGroupsDom();
  updatePreparationProgressDom();
}

function observePreparationGroups() {
  preparationRevealObserver?.disconnect();
  preparationRevealObserver = null;

  const groups = [...appEl.querySelectorAll('[data-reveal-on-scroll]')];
  if (groups.length === 0) {
    return;
  }

  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    groups.forEach((group) => group.classList.add('is-visible'));
    return;
  }

  preparationRevealObserver = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  );
  groups.forEach((group) => preparationRevealObserver.observe(group));
}

function hasSeenIntroThisSession() {
  try {
    return window.sessionStorage.getItem(introSeenKey) === '1';
  } catch {
    return false;
  }
}

function markIntroSeenThisSession() {
  try {
    window.sessionStorage.setItem(introSeenKey, '1');
  } catch {
    // Si sessionStorage no está disponible (modo privado/restricción), Aurora
    // sigue funcionando: la intro puede repetirse solo en esa sesión degradada.
  }
}

function forgetIntroSeenThisSession() {
  try {
    window.sessionStorage.removeItem(introSeenKey);
  } catch {
    // Igual que al guardar: si sessionStorage no está disponible, la UI sigue.
  }
}

function scheduleIndexUnlock(short = false) {
  clearCoverIntroTimers();
  coverIntroTimers = [
    setTimeout(async () => {
      if (coverIntroState !== 'revealing') return;
      coverIntroState = 'done';
      shouldFocusIndexAfterRender = true;
      await renderNow();
      // Director Mode (QA): la etapa "Hero" del recorrido automático no tiene
      // timer propio — se engancha acá, en el mismo punto donde el ritual real
      // ya termina solo, en vez de reimplementar la coreografía completa.
      if (directorPlaythrough && directorPlaythrough.stageIndex === 0) {
        directorPlaythrough.stageIndex = 1;
        advanceDirectorStage();
      }
    }, short ? 700 : 3200),
  ];
}

async function revealIndexAfterIntro({ short = false } = {}) {
  markIntroSeenThisSession();
  clearCoverIntroTimers();
  if (coverIntroState === 'revealing' || coverIntroState === 'done') {
    return;
  }
  coverIntroState = 'revealing';
  await renderNow();
  scheduleIndexUnlock(short);
}

function attachIntroVideoEvents() {
  if (coverIntroState !== 'video') {
    return;
  }
  const video = appEl.querySelector('[data-aurora-intro-video]');
  if (!video) {
    revealIndexAfterIntro({ short: true });
    return;
  }

  const finishWithFade = () => {
    if (coverIntroState !== 'video') return;
    video.closest('.cover-index-stage')?.classList.add('is-video-ending');
    // La coreografía de salida en CSS (texto se retira → pausa → la escena
    // muere → el plano se disuelve) dura 3.7s en total (`experience.css`,
    // bloque `.intro-video-shell`/`.intro-video`/`.page-index` bajo
    // `is-video-ending`). Este timeout espera a que termine del todo antes de
    // reemplazar el DOM — si el `innerHTML` llegara antes, cortaría la
    // animación a mitad de camino.
    coverIntroTimers.push(setTimeout(() => revealIndexAfterIntro(), 3850));
  };
  const fallback = () => revealIndexAfterIntro({ short: true });
  const fallbackIfStillPaused = () => {
    if (coverIntroState === 'video' && video.paused && video.currentTime === 0) {
      fallback();
    }
  };

  video.addEventListener('ended', finishWithFade, { once: true });
  video.addEventListener('error', fallback, { once: true });
  // Director Mode (QA): el recorrido automático acelera el video real con su
  // propio `playbackRate` en vez de recortar la coreografía — la transición de
  // salida (`finishWithFade`, arriba) sigue a su ritmo real sin importar la
  // velocidad, a propósito.
  if (directorPlaythrough) {
    video.playbackRate = directorPlaythrough.speed;
  }
  video.play?.().catch(() => {
    coverIntroTimers.push(setTimeout(fallbackIfStillPaused, 1200));
  });
}

async function renderNow() {
  const { now, chapterStatuses, devScenario } = resolveContext();
  const view = getStoryView(storyPackage, { now, chapterStatuses });

  if (view.currentMode !== StoryMode.PRE_TRIP) {
    showingPreparations = false;
  }

  // El prefijo `director:` viene del panel de Director Mode, que ya muestra esta
  // misma información (fecha simulada/modo) de forma más integrada — se evita
  // duplicarla como banner suelto encima de la escena que se está revisando.
  const banner = devScenario && !devScenario.startsWith('director:')
    ? `<div class="dev-banner">Vista de desarrollo — escenario forzado: <strong>${devScenario}</strong>. No refleja el estado real.</div>`
    : '';

  // Durante un escenario de desarrollo no se leen Memorias reales — la sección
  // completa queda oculta igualmente (interactive: false), pero así evitamos
  // incluso la lectura de datos reales mientras se simula un momento distinto.
  // En EPILOGUE, visibleChapter es el capítulo especial (storyEngine ya lo resuelve así).
  const memories = devScenario ? [] : loadChapterMemories(view.visibleChapter);
  const checklistMemories = !devScenario && view.currentMode === StoryMode.PRE_TRIP
    ? await loadChecklistMemories()
    : {};
  const preparationCompletedIds = Object.entries(checklistMemories)
    .filter(([, memory]) => memory?.completed)
    .map(([id]) => id);

  // Las fotos ya capturadas en todo el viaje solo hacen falta para el selector del
  // epílogo y para el Álbum del viaje — el resto del tiempo no se leen de más.
  const needsTripWide = !devScenario && (view.currentMode === StoryMode.EPILOGUE || showingTripAlbum);
  const tripMemories = needsTripWide ? loadMemories(storyPackage.storyId) : [];

  const photoIds = devScenario ? new Set() : collectPhotoIds([memories, tripMemories]);
  const photoUrls = await resolvePhotoUrls(photoIds);

  activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  activeObjectUrls = Object.values(photoUrls).filter((url) => url.startsWith('blob:'));

  if (!devScenario) {
    resolveNotificationState(view, now);
  }

  if (view.currentMode === StoryMode.PRE_TRIP && coverIntroState === 'idle') {
    if (hasSeenIntroThisSession()) {
      coverIntroState = 'done';
    } else if (prefersReducedMotion()) {
      coverIntroState = 'revealing';
      markIntroSeenThisSession();
      scheduleIndexUnlock(true);
    } else {
      coverIntroState = 'video';
    }
  } else if (view.currentMode !== StoryMode.PRE_TRIP && coverIntroState !== 'done') {
    clearCoverIntroTimers();
    coverIntroState = 'done';
  }

  const directorPanel = isDirectorModeEnabled()
    ? renderDirectorPanel({
        collapsed: directorPanelCollapsed,
        simulatedDate: directorOverride?.now ?? null,
        currentMode: view.currentMode,
        visibleChapterTitle: view.visibleChapter?.title ?? null,
        introState: coverIntroState,
        playthrough: directorPlaythrough,
      })
    : '';

  appEl.innerHTML =
    banner +
    directorPanel +
    renderExperience(view, storyPackage, now, {
      interactive: !devScenario,
      memories,
      confirmingClose,
      justTransformed,
      photoUrls,
      stagedPhotosBySlot,
      availableTripPhotos: tripWidePhotoIds(tripMemories),
      showingTripAlbum,
      tripMemories,
      installBanner: devScenario ? null : resolveInstallBanner(),
      pendingNotification: devScenario ? null : currentPendingNotification,
      coverIntroState: view.currentMode === StoryMode.PRE_TRIP ? coverIntroState : 'done',
      lockedChapterNotice,
      showingPreparations,
      preparationCompletedIds,
    });

  if (shouldFocusIndexAfterRender) {
    const preTripBook = appEl.querySelector('.book-pretrip');
    if (preTripBook) {
      preTripBook.scrollTop = preTripBook.clientHeight;
    }
    shouldFocusIndexAfterRender = false;
  }

  attachIntroVideoEvents();

  if (lockedChapterNotice) {
    appEl.querySelector('[data-action="close-locked-chapter"]')?.focus({ preventScroll: true });
  }

  observePreparationGroups();
  applyPageTransition(showingTripAlbum ? 'trip-album' : showingPreparations ? 'preparations' : view.currentMode);

  // Se muestra una única vez: si algo más dispara un renderNow() más tarde, ya no vuelve a aparecer.
  justTransformed = false;
}

// ============================================================================
// DIRECTOR MODE (QA) — recorrido automático. Reutiliza exactamente el mismo
// mecanismo de `{now, chapterStatuses}` que la navegación rápida (ver
// `applyDirectorStage`) y el propio ritual del video (ver el hook en
// `scheduleIndexUnlock` arriba) — no reimplementa nada, solo encadena etapas.
function applyDirectorStage(stage) {
  clearCoverIntroTimers();
  if (stage.kind === 'ritual-video') {
    forgetIntroSeenThisSession();
    coverIntroState = 'video';
    directorOverride = null;
    showingTripAlbum = false;
  } else {
    coverIntroState = 'done';
    directorOverride = { now: stage.now, chapterStatuses: stage.chapterStatuses, label: stage.key };
    showingTripAlbum = Boolean(stage.openAlbum);
  }
}

function scheduleDirectorAdvance(stage) {
  directorPlaythrough.timerId = setTimeout(() => {
    if (!directorPlaythrough) return;
    if (directorPlaythrough.stageIndex + 1 >= DIRECTOR_STAGES.length) {
      directorPlaythrough = null; // recorrido terminado — la app queda mostrando "Final"
      return;
    }
    directorPlaythrough.stageIndex += 1;
    advanceDirectorStage();
  }, stage.dwellMs / directorPlaythrough.speed);
}

function advanceDirectorStage() {
  if (!directorPlaythrough) return;
  const stage = DIRECTOR_STAGES[directorPlaythrough.stageIndex];
  applyDirectorStage(stage);
  renderNow();
  // La etapa de video no programa timer propio: el ritual real avanza solo
  // (ended -> finishWithFade -> revealIndexAfterIntro -> scheduleIndexUnlock),
  // que es quien llama de vuelta a advanceDirectorStage() al terminar.
  if (stage.kind !== 'ritual-video') {
    scheduleDirectorAdvance(stage);
  }
}

function startDirectorPlaythrough() {
  directorPlaythrough = { stageIndex: 0, speed: directorPlaythrough?.speed ?? 1, paused: false, timerId: null };
  advanceDirectorStage();
}

function stopDirectorPlaythrough() {
  if (!directorPlaythrough) return;
  clearTimeout(directorPlaythrough.timerId);
  directorPlaythrough = null;
}

function pauseDirectorPlaythrough() {
  if (!directorPlaythrough || directorPlaythrough.paused) return;
  clearTimeout(directorPlaythrough.timerId);
  directorPlaythrough.timerId = null;
  directorPlaythrough.paused = true;
  appEl.querySelector('[data-aurora-intro-video]')?.pause();
}

function resumeDirectorPlaythrough() {
  if (!directorPlaythrough || !directorPlaythrough.paused) return;
  directorPlaythrough.paused = false;
  const stage = DIRECTOR_STAGES[directorPlaythrough.stageIndex];
  if (stage.kind === 'ritual-video') {
    appEl.querySelector('[data-aurora-intro-video]')?.play();
  } else {
    // Simplificación intencional: al reanudar, la etapa vuelve a esperar su
    // tiempo de lectura completo en vez de trackear el tiempo restante exacto
    // — es una herramienta de QA, no hace falta esa precisión.
    scheduleDirectorAdvance(stage);
  }
}
// ============================================================================ fin DIRECTOR MODE

appEl.addEventListener('change', async (event) => {
  const input = event.target.closest('input.add-photos-input');
  if (!input || !input.files || input.files.length === 0) {
    return;
  }
  const { chapterId, activityId } = input.dataset;
  const key = photoSlotKey(chapterId, activityId || null);
  const existing = stagedPhotosBySlot.get(key) ?? [];
  const added = Array.from(input.files).map((file) => ({
    tempId: crypto.randomUUID(),
    file,
    url: URL.createObjectURL(file),
  }));
  stagedPhotosBySlot.set(key, [...existing, ...added]);
  await renderNow();
});

appEl.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }
  const { action, chapterId, memoryId, activityId, tempId, photoId, preparationId } = button.dataset;
  const key = chapterId !== undefined ? photoSlotKey(chapterId, activityId || null) : null;

  // Director Mode (QA): cualquier navegación real mientras el recorrido
  // automático está activo lo detiene, para no dejar estados raros a mitad de
  // una transición programada — antes de procesar la acción normalmente.
  if (directorPlaythrough && !action?.startsWith('director-')) {
    stopDirectorPlaythrough();
  }

  if (action === 'start') {
    markChapterStarted(storyPackage.storyId, chapterId);
  } else if (action === 'open-preparations') {
    showingPreparations = true;
  } else if (action === 'close-preparations') {
    showingPreparations = false;
  } else if (action === 'toggle-preparation') {
    const completed = button.dataset.completed !== 'true';
    await upsertChecklistMemory(preparationId, {
      completed,
      title: button.dataset.title,
      category: button.dataset.category,
    });
    updatePreparationToggleDom(button, completed);
    return;
  } else if (action === 'open-locked-chapter') {
    lockedChapterNotice = chooseLockedChapterNotice(button.dataset.unlockLabel);
  } else if (action === 'close-locked-chapter') {
    lockedChapterNotice = null;
  } else if (action === 'replay-intro') {
    clearCoverIntroTimers();
    forgetIntroSeenThisSession();
    shouldFocusIndexAfterRender = false;
    coverIntroState = prefersReducedMotion() ? 'revealing' : 'video';
    if (coverIntroState === 'revealing') {
      markIntroSeenThisSession();
      scheduleIndexUnlock(true);
    }
  } else if (action === 'ask-close') {
    confirmingClose = true;
  } else if (action === 'cancel-close') {
    confirmingClose = false;
  } else if (action === 'complete') {
    const isEpilogue = chapterId === storyPackage.specialChapter?.id;
    markChapterCompleted(storyPackage.storyId, chapterId);
    confirmingClose = false;
    if (isEpilogue) {
      justTransformed = true;
    }
  } else if (action === 'create-memory') {
    const slot = button.closest('.memory-slot');
    const note = slot.querySelector('.memory-note-input')?.value.trim() ?? '';
    const staged = stagedPhotosBySlot.get(key) ?? [];
    if (!note && staged.length === 0) {
      return;
    }
    const photos = [];
    for (const photo of staged) {
      photos.push(await savePhotoBlob(photo.file));
    }
    createNoteMemory(storyPackage.storyId, chapterId, activityId || null, note, { photos });
    staged.forEach((photo) => URL.revokeObjectURL(photo.url));
    stagedPhotosBySlot.delete(key);
  } else if (action === 'select-place') {
    const slot = button.closest('.memory-slot');
    const place = slot.querySelector('.memory-place-select').value;
    if (!place) {
      return;
    }
    createNoteMemory(storyPackage.storyId, chapterId, activityId || null, place);
  } else if (action === 'select-epilogue-photo') {
    createNoteMemory(storyPackage.storyId, chapterId, activityId || null, '', { photos: [photoId] });
  } else if (action === 'remove-staged-photo') {
    const staged = stagedPhotosBySlot.get(key) ?? [];
    const removed = staged.find((photo) => photo.tempId === tempId);
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }
    stagedPhotosBySlot.set(
      key,
      staged.filter((photo) => photo.tempId !== tempId)
    );
  } else if (action === 'set-primary-photo') {
    const staged = stagedPhotosBySlot.get(key) ?? [];
    const index = staged.findIndex((photo) => photo.tempId === tempId);
    if (index > 0) {
      const [chosen] = staged.splice(index, 1);
      staged.unshift(chosen);
    }
    stagedPhotosBySlot.set(key, staged);
  } else if (action === 'favorite-memory') {
    toggleFavorite(storyPackage.storyId, memoryId);
  } else if (action === 'archive-memory') {
    archiveMemory(storyPackage.storyId, memoryId);
  } else if (action === 'open-album') {
    showingTripAlbum = true;
  } else if (action === 'close-album') {
    showingTripAlbum = false;
  } else if (action === 'install-app') {
    await dismissInstallBannerWithFade();
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
    }
    installDismissed = true;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } else if (action === 'dismiss-install') {
    await dismissInstallBannerWithFade();
    installDismissed = true;
  } else if (action === 'allow-notifications') {
    if (typeof Notification !== 'undefined') {
      await Notification.requestPermission();
    }
  } else if (action === 'dismiss-notification-prompt') {
    if (currentPendingNotification) {
      dismissedNotificationKey = currentPendingNotification.key;
    }
  } else if (action === 'director-toggle-panel') {
    directorPanelCollapsed = !directorPanelCollapsed;
  } else if (action?.startsWith('director-goto-')) {
    stopDirectorPlaythrough();
    const stage = findDirectorStage(action.replace('director-goto-', ''));
    if (stage) {
      applyDirectorStage(stage);
    }
  } else if (action === 'director-new-user') {
    stopDirectorPlaythrough();
    forgetIntroSeenThisSession();
    window.localStorage.removeItem(notifiedKey);
    deferredInstallPrompt = null;
    installDismissed = false;
    installEligibleAt = null;
    clearTimeout(installRevealTimer);
    dismissedNotificationKey = null;
    currentPendingNotification = null;
    directorOverride = null;
    coverIntroState = 'idle';
    clearCoverIntroTimers();
  } else if (action === 'director-play') {
    // `startDirectorPlaythrough` ya renderiza (vía `advanceDirectorStage`) —
    // evita el `renderNow()` compartido de abajo para no duplicar el render.
    startDirectorPlaythrough();
    return;
  } else if (action === 'director-pause') {
    pauseDirectorPlaythrough();
  } else if (action === 'director-resume') {
    resumeDirectorPlaythrough();
  } else if (action === 'director-stop') {
    stopDirectorPlaythrough();
  } else if (action?.startsWith('director-speed-')) {
    if (directorPlaythrough) {
      directorPlaythrough.speed = Number(action.replace('director-speed-', ''));
      const stage = DIRECTOR_STAGES[directorPlaythrough.stageIndex];
      if (stage.kind === 'ritual-video') {
        const video = appEl.querySelector('[data-aurora-intro-video]');
        if (video) {
          video.playbackRate = directorPlaythrough.speed;
        }
      } else if (!directorPlaythrough.paused) {
        clearTimeout(directorPlaythrough.timerId);
        scheduleDirectorAdvance(stage);
      }
    }
  } else {
    return;
  }
  await renderNow();
});

document.addEventListener('keydown', async (event) => {
  if (event.key === 'Escape' && lockedChapterNotice) {
    lockedChapterNotice = null;
    await renderNow();
  }
});

// Sincroniza en segundo plano si hay un accessToken guardado (Épica 5) — nunca
// bloquea el primer render, nunca corre durante un escenario de desarrollo, y
// si no hay token/red/backend simplemente no hace nada (Aurora sigue 100% local).
let syncing = false;
async function trySyncInBackground() {
  if (syncing || getDevOverride()) {
    return;
  }
  syncing = true;
  try {
    const merged = await syncNow(storyPackage.storyId);
    if (merged) {
      await renderNow();
    }
  } finally {
    syncing = false;
  }
}
window.addEventListener('online', trySyncInBackground);

renderNow();
trySyncInBackground();
