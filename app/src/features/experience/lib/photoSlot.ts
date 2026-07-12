// Identifica el "cajón" de fotos en curso (todavía sin guardar) de una actividad,
// del espacio libre general (activityId: null) o de un prompt del epílogo (que usa
// su propio prompt.id como activityId). Debe coincidir EXACTO con el cálculo del
// orquestador. Port verbatim de render.js.
export function photoSlotKey(chapterId: string, activityId: string | null): string {
  return `${chapterId}::${activityId ?? ""}`;
}

/** Una foto elegida pero todavía sin guardar (vive en memoria hasta "Guardar este recuerdo"). */
export interface StagedPhoto {
  tempId: string;
  file: File;
  url: string;
}
