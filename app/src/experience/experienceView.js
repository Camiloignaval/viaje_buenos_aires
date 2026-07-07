// Único archivo de esta carpeta que toca `document`: carga el Story Package real,
// ejecuta el motor, maneja las acciones del usuario y pinta el resultado de render.js.
// Ver README.md.

import rawStoryPackage from '../story/data/story-ba2026.json';
import { loadStoryPackage } from '../story/storyPackage/storyPackage.js';
import { getStoryView } from '../story/storyEngine/storyEngine.js';
import { loadProgress, markChapterStarted, markChapterCompleted } from '../story/progressStore/progressStore.js';
import { loadMemories, createNoteMemory, toggleFavorite, archiveMemory } from '../memory/memoryStore.js';
import { renderExperience } from './render.js';

const storyPackage = loadStoryPackage(rawStoryPackage);
const appEl = document.getElementById('app');

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

function resolveContext() {
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

function renderNow() {
  const { now, chapterStatuses, devScenario } = resolveContext();
  const view = getStoryView(storyPackage, { now, chapterStatuses });

  const banner = devScenario
    ? `<div class="dev-banner">Vista de desarrollo — escenario forzado: <strong>${devScenario}</strong>. No refleja el estado real.</div>`
    : '';

  // Durante un escenario de desarrollo no se leen Memorias reales — la sección
  // completa queda oculta igualmente (interactive: false), pero así evitamos
  // incluso la lectura de datos reales mientras se simula un momento distinto.
  const memories = devScenario ? [] : loadChapterMemories(view.visibleChapter);

  appEl.innerHTML =
    banner + renderExperience(view, storyPackage, now, { interactive: !devScenario, memories });
}

appEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }
  const { action, chapterId, memoryId, activityId } = button.dataset;

  if (action === 'start') {
    markChapterStarted(storyPackage.storyId, chapterId);
  } else if (action === 'complete') {
    markChapterCompleted(storyPackage.storyId, chapterId);
  } else if (action === 'create-memory') {
    const slot = button.closest('.memory-slot');
    const note = slot.querySelector('.memory-note-input').value.trim();
    if (!note) {
      return;
    }
    createNoteMemory(storyPackage.storyId, chapterId, activityId || null, note);
  } else if (action === 'favorite-memory') {
    toggleFavorite(storyPackage.storyId, memoryId);
  } else if (action === 'archive-memory') {
    archiveMemory(storyPackage.storyId, memoryId);
  } else {
    return;
  }
  renderNow();
});

renderNow();
