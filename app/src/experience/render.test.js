import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStoryView } from '../story/storyEngine/storyEngine.js';
import { renderExperience, photoSlotKey } from './render.js';

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
        copy: { open: 'Abrimos el día 1.', close: 'Cerramos el día 1 con calma.' },
        activities: [
          {
            id: 'act-1',
            title: 'Actividad de prueba',
            timeWindow: '10:00',
            description: 'Una descripción de prueba.',
            category: 'gastronomía',
            relatedPlaceId: 'place-1',
            moment: 'El primer momento de prueba',
          },
        ],
        suggestedMemories: [
          { id: 'mem-sug-1', relatedActivityId: 'act-1', type: 'photo', prompt: 'Un recuerdo sugerido de prueba.' },
          { id: 'mem-sug-2', relatedActivityId: null, type: 'note', prompt: 'Un recuerdo libre de prueba.' },
        ],
        traditions: [{ title: 'Tradición de prueba', body: 'Cómo se hace la tradición de prueba.' }],
        microDiscoveries: ['Un descubrimiento de prueba, escondido a la vista.'],
        nightNote: 'Antes de dormir, caminen un rato más sin rumbo.',
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
    checklist: [
      { id: 'doc-1', category: 'Documentos', label: 'Cédula o pasaporte vigente' },
      { id: 'eq-1', category: 'Equipaje', label: 'Cargador del celular' },
      { id: 'app-1', category: 'Apps instaladas', label: 'Google Maps' },
      { id: 'din-1', category: 'Dinero', label: 'Avisar al banco del viaje' },
      { id: 'lug-1', category: 'Lugares visitados', label: 'Lugar con spoiler' },
    ],
    specialChapter: {
      id: 'chapter-epilogue',
      order: 3,
      title: 'Epílogo de prueba',
      date: '2027-01-15',
      copy: { open: 'Hoy es tu día.' },
      prompts: [
        { id: 'p1', label: 'Reflexión', type: 'creation', memoryType: 'note', creationPrompt: '¿Qué te gustaría recordar?' },
        {
          id: 'p2',
          label: 'Mejor momento',
          type: 'retrospective',
          retrospectiveSource: 'memory',
          sourceCategory: 'photo',
          selectionPrompt: '¿Cuál fue el mejor momento?',
        },
        {
          id: 'p3',
          label: 'Restaurante favorito',
          type: 'retrospective',
          retrospectiveSource: 'place',
          sourceCategory: 'restaurants',
          selectionPrompt: '¿Cuál fue tu restaurante favorito?',
        },
        {
          id: 'p4',
          label: 'Cafetería favorita',
          type: 'retrospective',
          retrospectiveSource: 'place',
          sourceCategory: 'cafes',
          selectionPrompt: '¿Y tu cafetería favorita?',
        },
      ],
    },
    baseCopy: {
      welcomeMessage: 'Bienvenida a esta historia de prueba.',
      dailyOpenTemplate: 'Hoy comienza un capítulo.',
      dailyCloseTemplate: 'Cerramos con calma, genérico.',
      finalLetter: 'Esta es la carta final de prueba.',
    },
  };
}

test('pre_trip renderiza sin errores y el índice no revela títulos futuros ni copy negativo', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /chapter-index/);
  assert.match(html, /data-action="replay-intro"/);
  assert.doesNotMatch(html, /Nos espera\./); // corrección: nunca una promesa genérica repetida
  assert.doesNotMatch(html, /Todavía no|Bloqueado|Aún no/);
  assert.doesNotMatch(html, />Día 1</);
  assert.doesNotMatch(html, />Día 2</);
  assert.match(html, /10 de enero/); // fecha del capítulo 1, nunca su título
});

test('pre_trip: cada capítulo futuro tiene su propia promesa breve, nunca la misma dos veces', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  const chapter1Teaser = html.match(/10 de enero<\/span>\s*<span class="chapter-index-status">([^<]+)</)[1];
  const chapter2Teaser = html.match(/11 de enero<\/span>\s*<span class="chapter-index-status">([^<]+)</)[1];
  assert.notStrictEqual(chapter1Teaser, chapter2Teaser);
});

test('pre_trip: el índice ofrece Preparativos como sección previa, no como capítulo', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, { preparationCompletedIds: ['doc-1'] });
  assert.match(html, /preparation-index-entry/);
  assert.match(html, />Preparativos</);
  assert.match(html, /Todo comienza antes del viaje\./);
  assert.match(html, /1 de 4 listos/);
  assert.match(html, /data-action="open-preparations"/);
  assert.equal(html.match(/chapter-index-number">I<\/span>/g)?.length ?? 0, 1);
  assert.doesNotMatch(html, /PRÓLOGO|Prólogo/);
});

test('pre_trip: Preparativos empieza con introducción editorial y continúa con checklist sin spoilers', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, {
    showingPreparations: true,
    preparationCompletedIds: ['doc-1', 'eq-1'],
  });
  assert.match(html, /page-preparations/);
  assert.match(html, /Todo viaje empieza antes del avión\./);
  assert.match(html, /Antes de salir, revisen lo esencial/);
  assert.match(html, />Documentos</);
  assert.match(html, />Equipaje</);
  assert.match(html, />Apps</);
  assert.match(html, />Dinero</);
  assert.match(html, /2 de 4 listos/);
  assert.doesNotMatch(html, /preparation-category-icon|preparation-category-mark/);
  assert.match(html, /data-preparation-progress/);
  assert.match(html, /data-preparation-progress-fill/);
  assert.equal(html.match(/data-reveal-on-scroll/g)?.length ?? 0, 4);
  assert.equal(html.match(/data-preparation-group-count/g)?.length ?? 0, 4);
  assert.match(html, /data-action="toggle-preparation"/);
  assert.match(html, /data-action="close-preparations"/);
  assert.doesNotMatch(html, /Lugar con spoiler|Lugares visitados|Momentos especiales/);
});

test('pre_trip: Preparativos no renderiza banners flotantes que compitan con la checklist', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, {
    showingPreparations: true,
    installBanner: { platform: 'android' },
    pendingNotification: { title: 'x', body: 'x' },
  });
  assert.doesNotMatch(html, /install-banner/);
  assert.doesNotMatch(html, /notification-prompt/);
});

test('pre_trip: Preparativos completos cambian el índice a Todo listo', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, {
    preparationCompletedIds: ['doc-1', 'eq-1', 'app-1', 'din-1'],
  });
  assert.match(html, /✓ Todo listo/);
  assert.match(html, /Todo está listo\./);
  assert.doesNotMatch(html, /4 de 4 listos/);
});

test('pre_trip: un capítulo bloqueado se puede tocar y prepara un gesto narrativo, no un error', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /data-action="open-locked-chapter"/);
  assert.match(html, /data-chapter-id="chapter-1"/);
  assert.match(html, /data-unlock-label="10 de enero"/);
  assert.doesNotMatch(html, /Acceso denegado|No disponible|error/i);
});

test('pre_trip: el modal de capítulo bloqueado habla con voz editorial e incluye la fecha', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, {
    lockedChapterNotice: {
      line: 'Cada día merece vivirse en su momento.',
      detail: 'Este capítulo se abrirá el 10 de enero.',
      actionLabel: 'Seguir explorando',
    },
  });
  assert.match(html, /role="dialog"/);
  assert.match(html, /Cada día merece vivirse en su momento\./);
  assert.match(html, /Este capítulo se abrirá el 10 de enero\./);
  assert.match(html, /data-action="close-locked-chapter"/);
  assert.match(html, />Seguir explorando<\/button>/);
});

test('pre_trip: durante la intro existe un solo índice real, oculto bajo el video', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, { coverIntroState: 'video' });
  assert.match(html, /cover-index-stage is-video-running/);
  assert.match(html, /src="\/video_intro_2\.mp4"/);
  assert.match(html, /muted/);
  assert.match(html, /playsinline/);
  assert.match(html, /preload="auto"/);
  assert.match(html, /data-aurora-intro-video/);
  assert.match(html, /Ciudad Ejemplo/);
  assert.match(html, /Un viaje de prueba/);
  assert.match(html, /Bienvenida a esta historia de prueba\./);
  assert.match(html, /page-index-pending/);
  assert.equal(html.match(/<ol class="chapter-index/g)?.length ?? 0, 1);
  assert.doesNotMatch(html, /data-action="replay-intro"/);
  assert.doesNotMatch(html, /silhouette-transition/);
  assert.doesNotMatch(html, /couple-mask/);
});

test('pre_trip: el índice aparece como HTML real cuando termina el video', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, { coverIntroState: 'revealing' });
  assert.match(html, /cover-index-stage is-index-writing/);
  assert.match(html, /page-index-ritual/);
  assert.match(html, /is-revealing/);
  assert.match(html, /chapter-index/);
  assert.equal(html.match(/<ol class="chapter-index/g)?.length ?? 0, 1);
  assert.doesNotMatch(html, /aurora-intro\.mp4/);
  assert.match(html, /index-particles/);
  assert.match(html, /intro-particle-rise/);
  assert.match(html, /intro-particle-glint/);
});
test('pre_trip numera los capítulos como índice de libro (romanos), no como chips', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /chapter-index-number">I</);
  assert.match(html, /chapter-index-number">II</);
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

test('in_progress con un capítulo iniciado muestra el botón de "cerrar" (E-4: pide confirmación, no cierra directo)', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'started' } });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /data-action="ask-close" data-chapter-id="chapter-1"/);
  assert.doesNotMatch(html, /data-action="start"/);
  assert.doesNotMatch(html, /data-action="complete"/);
});

test('E-4: con confirmingClose:true aparece la pregunta cálida y las dos opciones, ninguna con más peso', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'started' } });
  const html = renderExperience(view, pkg, now, { confirmingClose: true });
  assert.match(html, /¿Querés cerrar el día así como fue\?/);
  assert.match(html, /data-action="cancel-close" data-chapter-id="chapter-1"/);
  assert.match(html, /data-action="complete" data-chapter-id="chapter-1"/);
  assert.doesNotMatch(html, /data-action="ask-close"/);
});

test('El Final del Viaje: cerrar el epílogo también pide su propia confirmación, con más peso que la de un día', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-15T00:00:00Z');
  const view = getStoryView(pkg, {
    now,
    chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed', 'chapter-epilogue': 'started' },
  });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /data-action="ask-close" data-chapter-id="chapter-epilogue"/);
  assert.doesNotMatch(html, /data-action="complete"/);

  const confirmHtml = renderExperience(view, pkg, now, { confirmingClose: true });
  assert.match(confirmHtml, /Esto va a cerrar el viaje\. ¿Querés guardarlo así, tal como fue\?/);
  assert.match(confirmHtml, /data-action="cancel-close" data-chapter-id="chapter-epilogue">Seguir un poco más</);
  assert.match(confirmHtml, /data-action="complete" data-chapter-id="chapter-epilogue">Sí, guardar así/);
});

test('El Final del Viaje: el epílogo se puede cerrar sin haber respondido ningún prompt (sin gating)', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-15T00:00:00Z');
  const view = getStoryView(pkg, {
    now,
    chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed', 'chapter-epilogue': 'started' },
  });
  const html = renderExperience(view, pkg, now, { memories: [] });
  assert.match(html, /data-action="ask-close" data-chapter-id="chapter-epilogue"/);
});

test('E-4: el hueco entre "cerré hoy" y "mañana no amanece" muestra la frase de cierre del capítulo, nunca vacío', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z'); // chapter-2 recién abre el 2027-01-11
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed' } });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Cerramos el día 1 con calma\./);
  assert.doesNotMatch(html, /Actividad sin extras/); // el contenido del Día 2 nunca se revela
  assert.doesNotMatch(html, /data-action="start"|data-action="complete"/); // sin acciones de avance en este hueco
});

test('E-4: si el capítulo cerrado no tiene copy.close propio, usa el genérico de baseCopy', () => {
  const pkg = fixturePackage();
  delete pkg.chapters[0].copy.close;
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed' } });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Cerramos con calma, genérico\./);
});

test('in_progress con interactive:false no muestra ningún botón de acción', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, { interactive: false });
  assert.doesNotMatch(html, /data-action/);
});

test('in_progress muestra la tarjeta de actividad enriquecida: momento, descripción, categoría, lugar y links', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /<em>El primer momento de prueba\.<\/em>/);
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

test('in_progress muestra tradiciones, microdescubrimientos y la nota nocturna del capítulo', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Pequeñas tradiciones/);
  assert.match(html, /Tradición de prueba/);
  assert.match(html, /Pequeños descubrimientos/);
  assert.match(html, /Un descubrimiento de prueba, escondido a la vista\./);
  assert.match(html, /Antes de terminar el día/);
  assert.match(html, /Antes de dormir, caminen un rato más sin rumbo\./);
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
  assert.doesNotMatch(html, /Pequeñas tradiciones/);
  assert.doesNotMatch(html, /Pequeños descubrimientos/);
  assert.doesNotMatch(html, /Antes de terminar el día/);
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

test('una actividad sin recuerdos sugeridos y sin memorias no muestra la pregunta de invitación (Épica 3: sí queda el gesto quieto de agregar una foto)', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-11T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed' } });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /Actividad sin extras/); // Día 2, sin suggestedMemories
  // La invitación específica de actividad no aparece — solo queda la pregunta
  // libre del final del capítulo (siempre presente, ver el test de "Algo más de hoy").
  assert.doesNotMatch(html, /¿Hay algo de esto que quieras guardar\?/);
  assert.match(html, /memory-slot-quiet/); // el gesto de agregar una foto sigue disponible, sin preguntar nada
});

test('E-3: el espacio libre del final muestra los recuerdos sin actividad y siempre ofrece la pregunta abierta', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
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
  assert.match(html, /Nos espera\./);
  assert.match(html, /15 de enero/);
  assert.doesNotMatch(html, /Todavía no/);
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

test('El Final del Viaje: un prompt de creación/reflexión es una invitación funcional, no texto plano', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-15T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed' } });
  const html = renderExperience(view, pkg, now, { memories: [] });
  assert.match(html, /¿Qué te gustaría recordar\?/);
  assert.match(html, /data-action="create-memory" data-chapter-id="chapter-epilogue" data-activity-id="p1"/);
});

test('El Final del Viaje: los prompts pensados para foto se degradan con gracia a palabras, sin prometer una subida', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-15T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed' } });
  const html = renderExperience(view, pkg, now, { memories: [] });
  assert.match(html, /¿Cuál fue el mejor momento\?/);
  assert.match(html, /Por ahora, esto se guarda con tus palabras\./);
  assert.match(html, /data-action="create-memory" data-chapter-id="chapter-epilogue" data-activity-id="p2"/);
});

test('El Final del Viaje: un prompt retrospectivo sobre un lugar real ofrece un selector con el catálogo, no texto libre', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-15T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed' } });
  const html = renderExperience(view, pkg, now, { memories: [] });
  assert.match(html, /<select class="memory-place-select"><option value="Lugar de prueba">Lugar de prueba<\/option><\/select>/);
  assert.match(html, /data-action="select-place" data-chapter-id="chapter-epilogue" data-activity-id="p3"/);
});

test('El Final del Viaje: sin catálogo para esa categoría, el prompt de lugar degrada a texto libre', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-15T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed' } });
  const html = renderExperience(view, pkg, now, { memories: [] });
  assert.match(html, /¿Y tu cafetería favorita\?/);
  assert.match(html, /data-action="create-memory" data-chapter-id="chapter-epilogue" data-activity-id="p4"/);
  assert.doesNotMatch(html, /data-action="select-place"[^>]*data-activity-id="p4"/);
});

test('El Final del Viaje: un prompt ya respondido se transforma en su lugar, mostrando la nota guardada', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-15T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed' } });
  const memories = [{ id: 'mem-1', activityId: 'p3', note: 'La Cabrera', favorite: false, archived: false }];
  const html = renderExperience(view, pkg, now, { memories });
  assert.match(html, /La Cabrera/);
  assert.doesNotMatch(html, /data-action="select-place"/);
  assert.match(html, /data-action="favorite-memory" data-memory-id="mem-1"/);
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

test('El Final del Viaje: recién transformada, Memory Mode incluye una línea breve, una única vez', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-20T00:00:00Z');
  const view = getStoryView(pkg, {
    now,
    chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed', 'chapter-epilogue': 'completed' },
  });
  const html = renderExperience(view, pkg, now, { justTransformed: true });
  assert.match(html, /Esta historia se convirtió en un recuerdo\./);
  assert.match(html, /Esta es la carta final de prueba\./);
});

test('memory_mode sin justTransformed no muestra la línea de transformación', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-20T00:00:00Z');
  const view = getStoryView(pkg, {
    now,
    chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed', 'chapter-epilogue': 'completed' },
  });
  const html = renderExperience(view, pkg, now);
  assert.doesNotMatch(html, /Esta historia se convirtió en un recuerdo\./);
});

// ---- Épica 3: Media & Álbum ----

test('Épica 3: una actividad con foto en curso (sin guardar todavía) se "engancha" — aparece nota y botón de guardar', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-11T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed' } });
  const stagedPhotosBySlot = new Map([[photoSlotKey('chapter-2', 'act-2'), [{ tempId: 'temp-1', url: 'blob:temp-1' }]]]);
  const html = renderExperience(view, pkg, now, { stagedPhotosBySlot });
  assert.match(html, /blob:temp-1/);
  assert.match(html, /Principal/);
  assert.match(html, /data-action="create-memory" data-chapter-id="chapter-2" data-activity-id="act-2"/);
});

test('Épica 3: sin fotos en curso, la actividad sin recuerdo sugerido solo muestra "Agregar fotos", sin botón de guardar', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-11T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed' } });
  const html = renderExperience(view, pkg, now);
  assert.match(html, /\+ Agregar fotos/);
  assert.doesNotMatch(html, /data-action="create-memory" data-chapter-id="chapter-2" data-activity-id="act-2"/);
});

test('Épica 3: con dos fotos en curso, la segunda ofrece "Hacer principal" y ambas "Quitar"', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const stagedPhotosBySlot = new Map([
    [photoSlotKey('chapter-1', 'act-1'), [
      { tempId: 'temp-1', url: 'blob:temp-1' },
      { tempId: 'temp-2', url: 'blob:temp-2' },
    ]],
  ]);
  const html = renderExperience(view, pkg, now, { memories: [], stagedPhotosBySlot });
  assert.match(html, /data-action="set-primary-photo"[^>]*data-temp-id="temp-2"/);
  assert.match(html, /data-action="remove-staged-photo"[^>]*data-temp-id="temp-1"/);
  assert.match(html, /data-action="remove-staged-photo"[^>]*data-temp-id="temp-2"/);
});

test('Épica 3: una Memoria guardada con fotos muestra la principal y las secundarias', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const memories = [
    { id: 'mem-1', activityId: 'act-1', note: 'Un día increíble.', photos: ['photo-a', 'photo-b'], favorite: false, archived: false, createdAt: '2027-01-10T10:00:00Z' },
  ];
  const photoUrls = { 'photo-a': 'blob:a', 'photo-b': 'blob:b' };
  const html = renderExperience(view, pkg, now, { memories, photoUrls });
  assert.match(html, /<img class="memory-photo-primary" src="blob:a"/);
  assert.match(html, /<img class="memory-photo-thumb" src="blob:b"/);
});

test('Épica 3: "Tus recuerdos" aparece con lo ya guardado del capítulo (foto, nota, favorito) y no aparece si no hay nada', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });

  const vacio = renderExperience(view, pkg, now, { memories: [] });
  assert.doesNotMatch(vacio, /Tus recuerdos/);

  const memories = [
    { id: 'mem-1', activityId: 'act-1', note: 'Las medialunas.', photos: ['photo-a'], favorite: true, archived: false, createdAt: '2027-01-10T09:00:00Z' },
  ];
  const conRecuerdos = renderExperience(view, pkg, now, { memories, photoUrls: { 'photo-a': 'blob:a' } });
  assert.match(conRecuerdos, /Tus recuerdos/);
  assert.match(conRecuerdos, /memory-card-favorite/);
  assert.match(conRecuerdos, /Las medialunas\./);
});

test('Épica 3: el link al Álbum del viaje aparece cuando es interactivo, y no en modo de solo lectura', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  assert.match(renderExperience(view, pkg, now), /data-action="open-album"/);
  assert.doesNotMatch(renderExperience(view, pkg, now, { interactive: false }), /data-action="open-album"/);
});

test('Épica 3: el Álbum del viaje agrupa los recuerdos por capítulo, en orden narrativo, y omite capítulos sin nada', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const tripMemories = [
    { id: 'mem-1', chapterId: 'chapter-1', activityId: 'act-1', note: 'Del día 1.', photos: [], favorite: false, archived: false, createdAt: '2027-01-10T09:00:00Z' },
  ];
  const html = renderExperience(view, pkg, now, { showingTripAlbum: true, tripMemories });
  assert.match(html, /Tu álbum del viaje/);
  assert.match(html, /Día 1/);
  assert.match(html, /Del día 1\./);
  assert.doesNotMatch(html, /Día 2/); // chapter-2 no tiene memorias — no se muestra
  assert.match(html, /data-action="close-album"/);
});

test('Épica 3: el Álbum del viaje vacío muestra un estado neutral, sin culpa', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, { showingTripAlbum: true, tripMemories: [] });
  assert.match(html, /El álbum espera sus primeros recuerdos\./);
});

test('Épica 3: un prompt de foto del epílogo, habiendo fotos del viaje, ofrece elegir una real en vez de degradar a texto', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-15T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed' } });
  const html = renderExperience(view, pkg, now, {
    memories: [],
    availableTripPhotos: ['photo-a'],
    photoUrls: { 'photo-a': 'blob:a' },
  });
  assert.match(html, /data-action="select-epilogue-photo" data-chapter-id="chapter-epilogue" data-activity-id="p2" data-photo-id="photo-a"/);
  assert.match(html, /<img src="blob:a"/);
  assert.doesNotMatch(html, /Por ahora, esto se guarda con tus palabras\./); // ya no degrada, hay una foto real
});

test('Épica 3: elegir una foto real para un prompt del epílogo se guarda como Memoria (misma lógica que el texto)', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-15T00:00:00Z');
  const view = getStoryView(pkg, { now, chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed' } });
  const memories = [{ id: 'mem-1', activityId: 'p2', note: '', photos: ['photo-a'], favorite: false, archived: false }];
  const html = renderExperience(view, pkg, now, { memories, photoUrls: { 'photo-a': 'blob:a' } });
  assert.match(html, /<img class="memory-photo-primary" src="blob:a"/);
  assert.doesNotMatch(html, /data-action="select-epilogue-photo"/); // ya respondido, no vuelve a preguntar
});

// ---- Épica 4: Aurora vive (PWA) ----

test('Épica 4: sin installBanner no aparece ninguna invitación a instalar', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now);
  assert.doesNotMatch(html, /install-banner/);
});

test('Épica 4: en Android/Chrome, el banner de instalación ofrece el botón real', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, { installBanner: { platform: 'android' } });
  assert.match(html, /data-action="install-app"/);
  assert.match(html, /data-action="dismiss-install"/);
});

test('Épica 4: en iOS, el banner de instalación muestra instrucciones manuales (no hay gesto programático)', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, { installBanner: { platform: 'ios' } });
  assert.match(html, /Compartir/);
  assert.doesNotMatch(html, /data-action="install-app"/);
});

test('Épica 4: con interactive:false no aparece ningún banner de instalación ni de notificaciones, aunque se pidan', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-08T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const html = renderExperience(view, pkg, now, {
    interactive: false,
    installBanner: { platform: 'android' },
    pendingNotification: { title: 'x', body: 'x' },
  });
  assert.doesNotMatch(html, /install-banner/);
  assert.doesNotMatch(html, /notification-prompt/);
});

test('Épica 4: con una notificación pendiente, se pide permiso solo cuando hay algo real que avisar', () => {
  const pkg = fixturePackage();
  const now = new Date('2027-01-10T00:00:00Z');
  const view = getStoryView(pkg, { now });
  const sinPendiente = renderExperience(view, pkg, now);
  assert.doesNotMatch(sinPendiente, /notification-prompt/);

  const conPendiente = renderExperience(view, pkg, now, {
    pendingNotification: { title: 'Un viaje de prueba', body: 'Tu viaje empieza hoy.' },
  });
  assert.match(conPendiente, /Tu viaje empieza hoy\./);
  assert.match(conPendiente, /data-action="allow-notifications"/);
  assert.match(conPendiente, /data-action="dismiss-notification-prompt"/);
});
