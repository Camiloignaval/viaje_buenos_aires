import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStoryView } from '../story/storyEngine/storyEngine.js';
import { renderExperience } from './render.js';

function fixturePackage() {
  return {
    metadata: {
      destination: 'Ciudad Ejemplo',
      title: 'Un viaje de prueba',
      travelDates: { start: '2027-01-10', end: '2027-01-11' },
    },
    unlockRulesDefault: { requiresDateReached: true, requiresPreviousChapterCompleted: true },
    chapters: [
      {
        id: 'chapter-1',
        order: 1,
        title: 'Día 1',
        unlockRule: { requiresPreviousChapterCompleted: false },
        copy: { open: 'Abrimos el día 1.' },
        activities: [
          {
            id: 'act-1',
            title: 'Actividad de prueba',
            timeWindow: '10:00',
            description: 'Una descripción de prueba.',
            category: 'gastronomía',
            relatedPlaceId: 'place-1',
          },
        ],
        suggestedMemories: [
          { id: 'mem-sug-1', relatedActivityId: 'act-1', type: 'photo', prompt: 'Un recuerdo sugerido de prueba.' },
          { id: 'mem-sug-2', relatedActivityId: null, type: 'note', prompt: 'Un recuerdo libre de prueba.' },
        ],
      },
      { id: 'chapter-2', order: 2, title: 'Día 2', activities: [{ id: 'act-2', title: 'Actividad sin extras' }] },
    ],
    placesCatalog: {
      restaurants: [
        {
          id: 'place-1',
          name: 'Lugar de prueba',
          location: { name: 'Dirección de prueba', googleMapsUrl: 'https://maps.example/place-1' },
          recommendation: 'Una recomendación de prueba.',
        },
      ],
      cafes: [],
    },
    photoSpots: [
      { id: 'spot-1', title: 'Spot de prueba', relatedChapterId: 'chapter-1', bestTime: '09:00', tip: 'Un tip de prueba.' },
    ],
    collections: [
      {
        id: 'col-1',
        title: 'Colección de prueba',
        items: [{ id: 'item-1', name: 'Ítem de prueba', description: 'Descripción del ítem.', relatedChapterId: 'chapter-1' }],
      },
    ],
    specialChapter: {
      id: 'chapter-epilogue',
      order: 3,
      title: 'Epílogo de prueba',
      date: '2027-01-15',
      copy: { open: 'Hoy es tu día.' },
      prompts: [{ id: 'p1', label: 'Reflexión', type: 'creation', creationPrompt: '¿Qué te gustaría recordar?' }],
    },
    baseCopy: {
      welcomeMessage: 'Bienvenida a esta historia de prueba.',
      dailyOpenTemplate: 'Hoy comienza un capítulo.',
      finalLetter: 'Esta es la carta final de prueba.',
    },
  };
}

test('pre_trip muestra bienvenida, cuenta regresiva y capítulos como "Todavía no"', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Bienvenida a esta historia de prueba/);
  assert.match(html, /Faltan 2 días/);
  assert.match(html, /Todavía no/);
});

test('pre_trip con un día de diferencia dice "Falta 1 día"', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-09T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Falta 1 día\./);
});

test('in_progress muestra el visibleChapter con su copy y actividades', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Abrimos el día 1\./);
  assert.match(html, /Actividad de prueba/);
  assert.match(html, /Hoy/);
});

test('in_progress con un capítulo disponible muestra el botón de "iniciado"', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /data-action="start" data-chapter-id="chapter-1"/);
  assert.doesNotMatch(html, /data-action="complete"/);
});

test('in_progress con un capítulo iniciado muestra el botón de "cerrar"', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'started' } });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /data-action="complete" data-chapter-id="chapter-1"/);
  assert.doesNotMatch(html, /data-action="start"/);
});

test('in_progress con interactive:false no muestra ningún botón de acción', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, { interactive: false });
  assert.doesNotMatch(html, /data-action/);
});

test('in_progress muestra la tarjeta de actividad enriquecida: descripción, categoría, lugar y links', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Una descripción de prueba\./);
  assert.match(html, /gastronomía/);
  assert.match(html, /Dirección de prueba/);
  assert.match(html, /Una recomendación de prueba\./);
  assert.match(html, /href="https:\/\/maps\.example\/place-1"[^>]*>Mapa</);
});

test('in_progress muestra photo spots, ítems de colección y memorias sugeridas del capítulo', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Spot de prueba/);
  assert.match(html, /Ítem de prueba/);
  assert.match(html, /Un recuerdo sugerido de prueba\./);
});

test('in_progress no muestra secciones vacías cuando el capítulo no tiene contenido relacionado', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-11T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed' } });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Actividad sin extras/); // confirma que estamos viendo el Día 2
  assert.doesNotMatch(html, /Lugares para hoy/);
  assert.doesNotMatch(html, /Photo spots de hoy/);
  assert.doesNotMatch(html, /Para hoy también/);
});

test('E-3: la invitación a guardar un recuerdo aparece pegada a su actividad, no en una lista aparte', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, { memories: [] });
  assert.match(html, /¿Hay algo de esto que quieras guardar\?/);
  assert.match(html, /Un recuerdo sugerido de prueba\./);
  assert.match(html, /data-action="create-memory" data-chapter-id="chapter-1" data-activity-id="act-1"/);
});

test('E-3: una invitación ya usada se transforma en su lugar, mostrando la nota guardada', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const memories = [{ id: 'mem-1', activityId: 'act-1', note: 'Las medialunas, increíbles.', favorite: false, archived: false }];
  const html = renderExperience(view, pkg, now, { memories });
  assert.match(html, /Las medialunas, increíbles\./);
  assert.doesNotMatch(html, /¿Hay algo de esto que quieras guardar\?/);
  assert.match(html, /data-action="favorite-memory" data-memory-id="mem-1"/);
  assert.match(html, /data-action="archive-memory" data-memory-id="mem-1"/);
  assert.match(html, /Guardar aparte/);
});

test('con más de una Memoria para la misma actividad, se muestra solo la más reciente', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const memories = [
    { id: 'mem-old', activityId: 'act-1', note: 'La primera nota.', favorite: false, archived: false, createdAt: '2027-01-10T09:00:00Z' },
    { id: 'mem-new', activityId: 'act-1', note: 'La nota más reciente.', favorite: false, archived: false, createdAt: '2027-01-10T10:00:00Z' },
  ];
  const html = renderExperience(view, pkg, now, { memories });
  assert.match(html, /La nota más reciente\./);
  assert.doesNotMatch(html, /La primera nota\./);
});

test('una actividad sin recuerdos sugeridos y sin memorias no muestra ningún memory-slot', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-11T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed' } });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Actividad sin extras/); // Día 2, sin suggestedMemories
  assert.doesNotMatch(html, /memory-slot-invitation/);
});

test('E-3: el espacio libre del final muestra los recuerdos sin actividad y siempre ofrece la pregunta abierta', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now, memories: [] });
  const html = renderExperience(view, pkg, now, { memories: [] });
  assert.match(html, /Algo más de hoy/);
  assert.match(html, /Un recuerdo libre de prueba\./);
  assert.match(html, /¿Algo más de hoy que quieras guardar\?/);
  assert.match(html, /data-action="create-memory" data-chapter-id="chapter-1" data-activity-id=""/);
});

test('E-3: las Memorias sin actividad se muestran en el espacio libre del final, ocultando las archivadas', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const memories = [
    { id: 'mem-1', activityId: null, note: 'Una nota guardada.', favorite: false, archived: false },
    { id: 'mem-2', activityId: null, note: 'Una nota favorita.', favorite: true, archived: false },
    { id: 'mem-3', activityId: null, note: 'Una nota archivada.', favorite: false, archived: true },
  ];
  const html = renderExperience(view, pkg, now, { memories });
  assert.match(html, /Una nota guardada\./);
  assert.match(html, /Una nota favorita\./);
  assert.doesNotMatch(html, /Una nota archivada\./);
  assert.match(html, /♥ Marcar como favorito/);
  assert.match(html, /♥ Recuerdo favorito/);
});

test('E-3: con interactive:false no aparece ninguna invitación ni el espacio libre, aunque existan Memorias', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const memories = [{ id: 'mem-1', activityId: 'act-1', note: 'Una nota guardada.', favorite: false, archived: false }];
  const html = renderExperience(view, pkg, now, { interactive: false, memories });
  assert.doesNotMatch(html, /Guardar este recuerdo/);
  assert.doesNotMatch(html, /Una nota guardada\./);
  assert.doesNotMatch(html, /data-action="favorite-memory"/);
  assert.doesNotMatch(html, /Algo más de hoy/);
});

test('epilogue bloqueado muestra un mensaje de espera, sin revelar los prompts', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-12T00:00:00Z');
  const view = getStoryView(pkg, {
    now,
    chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed' },
  });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Todavía no\. Este capítulo espera su momento\./);
  assert.doesNotMatch(html, /Reflexión/);
  assert.doesNotMatch(html, /data-action/);
});

test('epilogue disponible muestra el botón de "iniciado", y ninguno si interactive:false', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-15T00:00:00Z');
  const view = getStoryView(pkg, {
    now,
    chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed' },
  });
  const interactiveHtml = renderExperience(view, pkg, now);
  assert.match(interactiveHtml, /data-action="start" data-chapter-id="chapter-epilogue"/);

  const readOnlyHtml = renderExperience(view, pkg, now, { interactive: false });
  assert.doesNotMatch(readOnlyHtml, /data-action/);
});

test('epilogue disponible muestra su copy y sus prompts', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-15T00:00:00Z');
  const view = getStoryView(pkg, {
    now,
    chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed' },
  });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Hoy es tu día\./);
  assert.match(html, /Reflexión/);
});

test('memory_mode muestra la carta final', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-20T00:00:00Z');
  const view = getStoryView(pkg, {
    now,
    chapterStatuses: {
      'chapter-1': 'completed',
      'chapter-2': 'completed',
      'chapter-epilogue': 'completed',
    },
  });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Esta es la carta final de prueba\./);
});
