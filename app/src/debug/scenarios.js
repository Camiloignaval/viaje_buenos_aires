// Escenarios preestablecidos para probar manualmente el Story Engine con Buenos Aires 2026.
// A diferencia de storyPackage.js/storyProgress.js/storyEngine.js, este archivo SÍ conoce
// los ids concretos de esta historia — existe únicamente para demostrarla, no es un módulo de dominio.

export const SCENARIOS = [
  {
    id: 'before-trip',
    label: 'Antes del viaje',
    now: '2026-07-10',
    chapterStatuses: {},
  },
  {
    id: 'day-1-available',
    label: 'Día 1 disponible',
    now: '2026-07-18',
    chapterStatuses: {},
  },
  {
    id: 'day-1-completed',
    label: 'Día 1 completado',
    now: '2026-07-19',
    chapterStatuses: { 'chapter-1': 'completed' },
  },
  {
    id: 'epilogue-available',
    label: 'Epílogo disponible',
    now: '2026-07-22',
    chapterStatuses: {
      'chapter-1': 'completed',
      'chapter-2': 'completed',
      'chapter-3': 'completed',
      'chapter-4': 'completed',
    },
  },
  {
    id: 'memory-mode',
    label: 'Memory mode',
    now: '2026-07-22',
    chapterStatuses: {
      'chapter-1': 'completed',
      'chapter-2': 'completed',
      'chapter-3': 'completed',
      'chapter-4': 'completed',
      'chapter-epilogue': 'completed',
    },
  },
];
