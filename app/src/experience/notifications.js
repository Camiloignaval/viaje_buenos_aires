// Decide si HOY amerita una notificación local (Épica 4 — Aurora vive). Función
// pura: StoryView + Story Package + `now` → una notificación posible, o null.
// No toca `Notification`, no lee `localStorage` — quien la dispara de verdad y
// evita repetirla el mismo día vive en `experienceView.js`. Ver README.md.
//
// Por qué no es una alarma en segundo plano: esta app no tiene backend ni Push
// (por diseño). Sin un servidor que empuje el aviso, la única forma honesta de
// notificar "en segundo plano" con solo el navegador es la Notification
// Triggers API — nunca se estabilizó en ningún navegador. Lo que sí es 100%
// posible sin backend: evaluar esto cada vez que Aurora se abre o vuelve a
// primer plano, y mostrar una notificación nativa en ese momento.

import { StoryMode } from '../story/storyEngine/storyEngine.js';
import { getChapterReferenceDate } from '../story/storyProgress/storyProgress.js';

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function sameCalendarDay(a, b) {
  const da = toDate(a);
  const db = toDate(b);
  return da.getUTCFullYear() === db.getUTCFullYear() && da.getUTCMonth() === db.getUTCMonth() && da.getUTCDate() === db.getUTCDate();
}

function sameMonthAndDay(a, b) {
  const da = toDate(a);
  const db = toDate(b);
  return da.getUTCMonth() === db.getUTCMonth() && da.getUTCDate() === db.getUTCDate();
}

function dateKey(now) {
  return toDate(now).toISOString().slice(0, 10);
}

/**
 * @param {object} view - Resultado de getStoryView.
 * @param {object} storyPackage - Story Package ya validado.
 * @param {Date|string} now
 * @returns {{ key: string, title: string, body: string } | null} `key` identifica
 *   el día+motivo — quien la use lo guarda para no repetirla el mismo día.
 */
export function resolveSignificantNotification(view, storyPackage, now) {
  const orderedChapters = [...storyPackage.chapters].sort((a, b) => a.order - b.order);
  const firstChapter = orderedChapters[0];

  if (firstChapter && sameCalendarDay(getChapterReferenceDate(firstChapter, storyPackage), now)) {
    return {
      key: `trip-start:${dateKey(now)}`,
      title: storyPackage.metadata.title,
      body: 'Tu viaje empieza hoy.',
    };
  }

  const chapterToday = orderedChapters.find(
    (chapter) => chapter !== firstChapter && sameCalendarDay(getChapterReferenceDate(chapter, storyPackage), now)
  );
  if (chapterToday && view.availableChapters.includes(chapterToday.id)) {
    return {
      key: `chapter:${chapterToday.id}`,
      title: chapterToday.title,
      body: 'Hoy se abre un nuevo capítulo de tu historia.',
    };
  }

  if (view.currentMode === StoryMode.MEMORY_MODE && firstChapter) {
    const start = getChapterReferenceDate(firstChapter, storyPackage);
    if (sameMonthAndDay(start, now) && !sameCalendarDay(start, now)) {
      return {
        key: `anniversary:${dateKey(now)}`,
        title: storyPackage.metadata.title,
        body: 'Hoy hace un año de este viaje.',
      };
    }
  }

  return null;
}
