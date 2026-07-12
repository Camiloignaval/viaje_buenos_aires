// Literales de estado de la Experiencia Conectada — MISMOS valores string que las
// versiones vanilla (connectedContext.js / storyContentStore.js / connectedReadiness.js)
// para que la lógica y su cobertura de tests sean idénticas.

export const TripContextStatus = {
  LOCAL: "local",
  LOADING: "loading",
  SUCCESS: "success",
  NOT_FOUND: "not-found",
  ERROR: "error",
} as const;
export type TripContextStatusValue =
  (typeof TripContextStatus)[keyof typeof TripContextStatus];

/** story y media comparten los mismos literales. */
export const ContentStatus = {
  LOCAL: "local",
  LOADING: "loading",
  EMPTY: "empty",
  SUCCESS: "success",
  ERROR: "error",
} as const;
export type ContentStatusValue =
  (typeof ContentStatus)[keyof typeof ContentStatus];

export const ReadinessStatus = {
  LOCAL: "local",
  LOADING: "loading",
  READY: "ready",
  PARTIAL: "partial",
  EMPTY: "empty",
  ERROR: "error",
} as const;
export type ReadinessStatusValue =
  (typeof ReadinessStatus)[keyof typeof ReadinessStatus];

export interface ContextState {
  status: TripContextStatusValue;
  error: string | null;
}

export interface ContentState {
  status: ContentStatusValue;
  error?: string | null;
}

export interface ReadinessState {
  status: ReadinessStatusValue;
  error: string | null;
}
