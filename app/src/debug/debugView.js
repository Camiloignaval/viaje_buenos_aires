// Conecta los controles de debug.html con el motor real (Fases 1 y 2) y vuelca el resultado.
// No es UI de producto — es una herramienta de desarrollo. Ver README.md de esta carpeta.

import rawStoryPackage from '../story/data/story-ba2026.json';
import { loadStoryPackage } from '../story/storyPackage/storyPackage.js';
import { getStoryView } from '../story/storyEngine/storyEngine.js';
import { ChapterStatus } from '../story/storyProgress/storyProgress.js';
import { SCENARIOS } from './scenarios.js';

const storyPackage = loadStoryPackage(rawStoryPackage);
const allChapters = [
  ...storyPackage.chapters,
  ...(storyPackage.specialChapter ? [storyPackage.specialChapter] : []),
];

const nowInput = document.getElementById('now-input');
const chapterControlsEl = document.getElementById('chapter-controls');
const scenariosEl = document.getElementById('scenarios');
const outputEl = document.getElementById('output');

const chapterSelects = {};

const FORCEABLE_STATUSES = [
  { value: '', label: 'No forzar' },
  { value: ChapterStatus.STARTED, label: 'Marcar como Iniciado' },
  { value: ChapterStatus.COMPLETED, label: 'Marcar como Finalizado' },
];

function buildChapterControls() {
  allChapters.forEach((chapter) => {
    const wrapper = document.createElement('label');
    wrapper.textContent = `${chapter.title} (${chapter.id}): `;

    const select = document.createElement('select');
    FORCEABLE_STATUSES.forEach(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
    select.addEventListener('change', render);

    chapterSelects[chapter.id] = select;
    wrapper.appendChild(select);
    chapterControlsEl.appendChild(wrapper);
  });
}

function buildScenarioButtons() {
  SCENARIOS.forEach((scenario) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = scenario.label;
    button.addEventListener('click', () => applyScenario(scenario));
    scenariosEl.appendChild(button);
  });
}

function applyScenario(scenario) {
  nowInput.value = scenario.now;
  allChapters.forEach((chapter) => {
    chapterSelects[chapter.id].value = scenario.chapterStatuses[chapter.id] ?? '';
  });
  render();
}

function readChapterStatuses() {
  const statuses = {};
  allChapters.forEach((chapter) => {
    const value = chapterSelects[chapter.id].value;
    if (value) {
      statuses[chapter.id] = value;
    }
  });
  return statuses;
}

function render() {
  const now = nowInput.value || new Date().toISOString().slice(0, 10);
  const view = getStoryView(storyPackage, { now, chapterStatuses: readChapterStatuses() });
  outputEl.textContent = JSON.stringify(view, null, 2);
}

nowInput.addEventListener('change', render);

buildChapterControls();
buildScenarioButtons();
applyScenario(SCENARIOS[0]);
