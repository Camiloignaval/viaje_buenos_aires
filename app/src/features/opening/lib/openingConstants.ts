export type OpeningVariant = "opening" | "micro" | "sting";

export const OPENING_STORAGE_KEY = "alaia:opening:lastShown:v1";
export const OPENING_VIDEO_SRC = "/media/alaia-opening.mp4";
export const OPENING_VIDEO_SRC_MOBILE = "/media/alaia-opening-mobile.mp4";
export const OPENING_MOBILE_MEDIA_QUERY = "(max-width: 640px)";

export const OPENING_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const OPENING_FADE_MS = 800;
export const OPENING_REDUCED_MOTION_MS = 200;

// La apertura se cierra cuando el video termina (onEnded). Estos valores son
// solo la red de seguridad por si el video se cuelga o nunca dispara "ended":
// se cierra a los (duración real + buffer), o al fallback si no hay metadata.
export const OPENING_SAFETY_BUFFER_MS = 2_000;
export const OPENING_SAFETY_FALLBACK_MS = 15_000;

export const SUPPORTED_OPENING_VARIANT: OpeningVariant = "opening";
