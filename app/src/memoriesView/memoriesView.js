// Conecta los controles de memories.html con memoryStore.js (Fase 7) y vuelve a
// pintar la lista después de cada acción. Herramienta de desarrollo, no UI de
// producto — ver README.md de esta carpeta.

import rawStoryPackage from '../story/data/story-ba2026.json';
import { loadStoryPackage } from '../story/storyPackage/storyPackage.js';
import { createNoteMemory, loadMemories, toggleFavorite, archiveMemory } from '../memory/memoryStore.js';

const storyPackage = loadStoryPackage(rawStoryPackage);
const allChapters = [
  ...storyPackage.chapters,
  ...(storyPackage.specialChapter ? [storyPackage.specialChapter] : []),
];

const chapterSelect = document.getElementById('chapter-select');
const activitySelect = document.getElementById('activity-select');
const noteInput = document.getElementById('note-input');
const createButton = document.getElementById('create-button');
const showArchivedCheckbox = document.getElementById('show-archived');
const listEl = document.getElementById('memories-list');

function findChapter(chapterId) {
  return allChapters.find((chapter) => chapter.id === chapterId) ?? null;
}

function chapterTitle(chapterId) {
  return findChapter(chapterId)?.title ?? chapterId;
}

function activityTitle(chapterId, activityId) {
  if (!activityId) {
    return null;
  }
  const activity = findChapter(chapterId)?.activities?.find((a) => a.id === activityId);
  return activity?.title ?? activityId;
}

function populateChapterSelect() {
  chapterSelect.innerHTML = allChapters
    .map((chapter) => `<option value="${chapter.id}">${chapter.title}</option>`)
    .join('');
  populateActivitySelect();
}

function populateActivitySelect() {
  const chapter = findChapter(chapterSelect.value) ?? allChapters[0];
  const activities = chapter?.activities ?? [];
  activitySelect.innerHTML = [
    '<option value="">(ninguna)</option>',
    ...activities.map((activity) => `<option value="${activity.id}">${activity.title}</option>`),
  ].join('');
}

function renderList() {
  const memories = loadMemories(storyPackage.storyId, undefined, {
    includeArchived: showArchivedCheckbox.checked,
  });

  if (memories.length === 0) {
    listEl.innerHTML = '<li class="empty">Todavía no hay memorias.</li>';
    return;
  }

  listEl.innerHTML = memories
    .map((memory) => {
      const activity = activityTitle(memory.chapterId, memory.activityId);
      return `
        <li class="${memory.archived ? 'archived' : ''}">
          <p class="meta">${chapterTitle(memory.chapterId)}${activity ? ` · ${activity}` : ''}</p>
          <p class="note-text">${memory.note}</p>
          <p class="date">${new Date(memory.createdAt).toLocaleString()}</p>
          <div class="row-actions">
            <button type="button" data-action="favorite" data-id="${memory.id}">
              ${memory.favorite ? '★ Favorita' : '☆ Marcar favorita'}
            </button>
            ${
              memory.archived
                ? '<span class="archived-label">Archivada</span>'
                : `<button type="button" data-action="archive" data-id="${memory.id}">Archivar</button>`
            }
          </div>
        </li>
      `;
    })
    .join('');
}

chapterSelect.addEventListener('change', populateActivitySelect);
showArchivedCheckbox.addEventListener('change', renderList);

createButton.addEventListener('click', () => {
  const note = noteInput.value.trim();
  if (!note) {
    return;
  }
  createNoteMemory(storyPackage.storyId, chapterSelect.value, activitySelect.value || null, note);
  noteInput.value = '';
  renderList();
});

listEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }
  const { action, id } = button.dataset;
  if (action === 'favorite') {
    toggleFavorite(storyPackage.storyId, id);
  } else if (action === 'archive') {
    archiveMemory(storyPackage.storyId, id);
  }
  renderList();
});

populateChapterSelect();
renderList();
