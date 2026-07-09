// Director Mode (QA): datos puros + helpers, sin tocar `document` ni el motor real.
// Se activa únicamente con `?director`/`?preview` en la URL — `experienceView.js`
// es quien decide qué hacer con esto; este archivo no muta nada por sí mismo.
// "Hero" e "Intro" son la misma etapa (`kind: 'ritual-video'`): en esta arquitectura
// el video ES la portada — separarlos exigiría tocar esa arquitectura, fuera de alcance.

export function isDirectorModeEnabled() {
  const params = new URLSearchParams(window.location.search);
  return params.has('director') || params.has('preview');
}

// Mismo shape que `DEV_SCENARIOS` (experienceView.js) — se consume tal cual por
// `getStoryProgress`/`getStoryView`. Fuente única para los botones de salto rápido
// y para el recorrido automático (nunca se duplican estos datos).
export const DIRECTOR_STAGES = [
  { key: 'hero', label: 'Hero', kind: 'ritual-video', dwellMs: 0 },
  { key: 'chapters', label: 'Capítulos', now: '2026-07-10', chapterStatuses: {}, dwellMs: 4000 },
  { key: 'day1', label: 'Día 1', now: '2026-07-18', chapterStatuses: {}, dwellMs: 5000 },
  {
    key: 'day2',
    label: 'Día 2',
    now: '2026-07-19',
    chapterStatuses: { 'chapter-1': 'completed' },
    dwellMs: 5000,
  },
  {
    key: 'day3',
    label: 'Día 3',
    now: '2026-07-20',
    chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed' },
    dwellMs: 5000,
  },
  {
    key: 'day4',
    label: 'Día 4',
    now: '2026-07-21',
    chapterStatuses: { 'chapter-1': 'completed', 'chapter-2': 'completed', 'chapter-3': 'completed' },
    dwellMs: 5000,
  },
  {
    key: 'album',
    label: 'Álbum',
    now: '2026-07-22',
    chapterStatuses: {
      'chapter-1': 'completed',
      'chapter-2': 'completed',
      'chapter-3': 'completed',
      'chapter-4': 'completed',
    },
    openAlbum: true,
    dwellMs: 3500,
  },
  {
    key: 'final',
    label: 'Final',
    now: '2026-07-23',
    chapterStatuses: {
      'chapter-1': 'completed',
      'chapter-2': 'completed',
      'chapter-3': 'completed',
      'chapter-4': 'completed',
      'chapter-epilogue': 'completed',
    },
    dwellMs: 3500,
  },
];

export function findDirectorStage(key) {
  return DIRECTOR_STAGES.find((stage) => stage.key === key) ?? null;
}

const INTRO_STATUS_LABEL = {
  idle: 'pendiente',
  video: 'reproduciendo',
  revealing: 'reproduciendo',
  done: 'finalizada',
};

/**
 * HTML puro (mismo estilo que `render.js`): recibe todo ya resuelto, no toca
 * `document`, no lee estado propio. `experienceView.js` arma `state` en cada
 * `renderNow()` y decide si llamar a esta función o no.
 */
export function renderDirectorPanel(state) {
  const { collapsed, simulatedDate, currentMode, visibleChapterTitle, introState, playthrough } = state;

  if (collapsed) {
    return `
      <button type="button" class="director-panel director-panel-collapsed" data-action="director-toggle-panel" aria-label="Abrir Director Mode">
        ▶
      </button>
    `;
  }

  const stageButtons = DIRECTOR_STAGES.map(
    (stage) => `<button type="button" data-action="director-goto-${stage.key}">${stage.label}</button>`
  ).join('');

  const playthroughStatus = playthrough
    ? `<p class="director-playthrough-status">Recorrido: ${DIRECTOR_STAGES[playthrough.stageIndex]?.label ?? '—'} / ${DIRECTOR_STAGES.length}<br />Velocidad: ${playthrough.speed}x${playthrough.paused ? ' (pausado)' : ''}</p>`
    : '';

  const playthroughControls = playthrough
    ? `
      <div class="director-row">
        ${playthrough.paused
          ? '<button type="button" data-action="director-resume">Reanudar</button>'
          : '<button type="button" data-action="director-pause">Pausar</button>'}
        <button type="button" data-action="director-stop">Detener</button>
      </div>
      <div class="director-row">
        <button type="button" data-action="director-speed-1" aria-current="${playthrough.speed === 1}">1x</button>
        <button type="button" data-action="director-speed-2" aria-current="${playthrough.speed === 2}">2x</button>
        <button type="button" data-action="director-speed-4" aria-current="${playthrough.speed === 4}">4x</button>
      </div>
    `
    : `
      <div class="director-row">
        <button type="button" data-action="director-play">▶ Reproducir historia</button>
      </div>
    `;

  return `
    <div class="director-panel" aria-label="Director Mode (QA)">
      <button type="button" class="director-panel-close" data-action="director-toggle-panel" aria-label="Ocultar panel">×</button>
      <div class="director-heading">
        <p class="director-title">Director Mode</p>
        <p class="director-subtitle">QA ? demos ? recorrido controlado</p>
      </div>

      <section class="director-section" aria-label="Escenarios">
        <p class="director-section-label">Escenarios</p>
        <div class="director-row director-stage-grid">${stageButtons}</div>
      </section>

      <section class="director-section" aria-label="Recorrido autom?tico">
        <p class="director-section-label">Recorrido</p>
        ${playthroughControls}
        ${playthroughStatus}
      </section>

      <section class="director-section" aria-label="Sesi?n">
        <p class="director-section-label">Sesi?n</p>
        <div class="director-row">
          <button type="button" data-action="replay-intro">Reiniciar experiencia</button>
          <button type="button" data-action="director-new-user">Usuario nuevo</button>
        </div>
      </section>

      <dl class="director-status">
        <dt>Fecha simulada</dt>
        <dd>${simulatedDate ?? 'reloj real'}</dd>
        <dt>Modo</dt>
        <dd>${currentMode}</dd>
        <dt>Capítulo activo</dt>
        <dd>${visibleChapterTitle ?? '—'}</dd>
        <dt>Intro</dt>
        <dd>${INTRO_STATUS_LABEL[introState] ?? introState}</dd>
      </dl>
    </div>
  `;
}
