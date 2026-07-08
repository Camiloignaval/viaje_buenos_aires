import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStoryView } from '../story/storyEngine/storyEngine.js';
import { resolveSignificantNotification } from './notifications.js';

function fixturePackage() {
  return {
    metadata: {
      destination: 'Ciudad Ejemplo',
      title: 'Un viaje de prueba',
      travelDates: { start: '2027-01-10', end: '2027-01-11' },
    },
    unlockRulesDefault: { requiresDateReached: true, requiresPreviousChapterCompleted: true },
    chapters: [
      { id: 'chapter-1', order: 1, title: 'Día 1', unlockRule: { requiresPreviousChapterCompleted: false } },
      { id: 'chapter-2', order: 2, title: 'Día 2' },
    ],
    specialChapter: {
      id: 'chapter-epilogue',
      order: 3,
      title: 'Epílogo de prueba',
      date: '2027-01-15',
    },
    baseCopy: { welcomeMessage: '', dailyOpenTemplate: '', dailyCloseTemplate: '', finalLetter: '' },
  };
}

test('el día en que empieza el viaje, avisa que el viaje empieza hoy', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T09:00:00Z');
  const view = getStoryView(pkg, { now });
  const notification = resolveSignificantNotification(view, pkg, now);
  assert.equal(notification.body, 'Tu viaje empieza hoy.');
  assert.equal(notification.key, 'trip-start:2027-01-10');
});

test('un día cualquiera sin nada significativo no devuelve ninguna notificación', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-12T09:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed' } });
  assert.equal(resolveSignificantNotification(view, pkg, now), null);
});

test('el día en que un capítulo nuevo (no el primero) se abre, avisa que hay un capítulo nuevo', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-11T09:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed' } });
  const notification = resolveSignificantNotification(view, pkg, now);
  assert.equal(notification.body, 'Hoy se abre un nuevo capítulo de tu historia.');
  assert.equal(notification.key, 'chapter:chapter-2');
});

test('si la fecha del capítulo llegó pero el anterior no se completó, no avisa (no está realmente disponible)', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-11T09:00:00Z');
  const view = getStoryView(pkg, { now }); // chapter-1 sigue sin completarse
  assert.equal(resolveSignificantNotification(view, pkg, now), null);
});

test('en Memory Mode, el aniversario del inicio del viaje avisa (un año después, no el mismo día)', () => {
  const pkg = fixturePackage();
  const now = new Date('2028-01-10T09:00:00Z');
  const chapterStatuses = { 'chapter-1': 'completed', 'chapter-2': 'completed', 'chapter-epilogue': 'completed' };
  const view = getStoryView(pkg, { now, chapterStatuses });
  const notification = resolveSignificantNotification(view, pkg, now);
  assert.equal(notification.body, 'Hoy hace un año de este viaje.');
  assert.equal(notification.key, 'anniversary:2028-01-10');
});

test('en Memory Mode, un día que no es aniversario no avisa nada', () => {
  const pkg = fixturePackage();
  const now = new Date('2028-03-01T09:00:00Z');
  const chapterStatuses = { 'chapter-1': 'completed', 'chapter-2': 'completed', 'chapter-epilogue': 'completed' };
  const view = getStoryView(pkg, { now, chapterStatuses });
  assert.equal(resolveSignificantNotification(view, pkg, now), null);
});
