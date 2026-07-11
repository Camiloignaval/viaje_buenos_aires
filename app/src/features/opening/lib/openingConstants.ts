export type OpeningVariant = "opening" | "micro" | "sting";

export const OPENING_STORAGE_KEY = "alaia:opening:lastShown:v1";
export const OPENING_VIDEO_SRC = "/media/alaia-opening.mp4";

export const OPENING_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const OPENING_CROSSFADE_START_MS = 2_800;
export const OPENING_HOME_STABLE_MS = 4_000;
export const OPENING_MAX_TIMEOUT_MS = 5_600;
export const OPENING_REDUCED_MOTION_MS = 200;

export const SUPPORTED_OPENING_VARIANT: OpeningVariant = "opening";
