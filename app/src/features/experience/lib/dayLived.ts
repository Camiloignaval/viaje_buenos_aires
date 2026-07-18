import type { Activity, PhotoSpot } from "@/features/story/engine/types";

export type PassageComposition = "pleno" | "caminado" | "pausa" | "umbral-cierre";

export interface ActivityPassageLayout {
  composition: PassageComposition;
  centered: boolean;
  showReferencePhoto: boolean;
}

const LOGISTICS = /log[ií]stica|llegada|traslado|aeropuerto|terminal/i;
const WALKING = /caminata|caminado|transici[oó]n|recorrido|trayecto/i;

function hasFixedVenue(activity: Activity): boolean {
  return Boolean(
    activity.relatedPlaceId ||
      activity.location?.googleMapsUrl ||
      activity.location?.uberDeepLink ||
      activity.location?.cabifyDeepLink,
  );
}

/** La composición es consecuencia del rol narrativo; nunca una elección decorativa. */
export function resolveActivityComposition(activity: Activity, index: number): PassageComposition {
  const role = `${activity.category ?? ""} ${activity.title}`;
  if ((index === 0 && LOGISTICS.test(role)) || LOGISTICS.test(activity.category ?? "")) {
    return "umbral-cierre";
  }
  if (
    activity.intelligence?.relaxLevel === "high" &&
    activity.intelligence?.energyLevel === "low"
  ) {
    return "pausa";
  }
  if (WALKING.test(role) && !hasFixedVenue(activity)) {
    return "caminado";
  }
  return "pleno";
}

/**
 * Aplica las restricciones editoriales del día sin tocar el Story Package: un
 * solo Pleno centrado marca el clímax visual. La fotografía editorial ya NO se
 * raciona: pertenece a la historia curada, así que toda actividad con `image`
 * muestra su lámina. La escasez que antes limitaba a dos fotos por día dejaba
 * páginas deshabitadas y escondía imágenes reales; el ritmo lo dan ahora las
 * composiciones (pleno · caminado · pausa · umbral), no la ausencia de foto.
 */
export function resolveDayPassageLayouts(activities: Activity[]): ActivityPassageLayout[] {
  const compositions = activities.map((activity, index) => {
    const resolved = resolveActivityComposition(activity, index);
    if (resolved === "pausa" && index > 0 && resolveActivityComposition(activities[index - 1], index - 1) === "pausa") {
      return activity.description || activity.relatedPlaceId ? "pleno" : "umbral-cierre";
    }
    return resolved;
  });
  // El día necesita un pico visual. Preferimos el Pleno con photoMoment; si no
  // hay ninguno marcado, el primer Pleno con fotografía disponible se vuelve el
  // clímax igual — nunca un día sin crescendo.
  let centeredIndex = activities.findIndex(
    (activity, index) =>
      compositions[index] === "pleno" && activity.intelligence?.photoMoment === true,
  );
  if (centeredIndex === -1) {
    centeredIndex = activities.findIndex(
      (activity, index) => compositions[index] === "pleno" && Boolean(activity.image),
    );
  }

  return activities.map((activity, index) => ({
    composition: compositions[index],
    centered: index === centeredIndex,
    showReferencePhoto: Boolean(activity.image),
  }));
}

function photoSpotNeedle(spot: PhotoSpot): string[] {
  return normalizeTokens(`${spot.title} ${spot.location?.name ?? ""}`);
}

function normalizeTokens(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);
}

/**
 * Asocia cada photoSpot del capítulo a la actividad que le corresponde por
 * coincidencia de título/lugar (determinista, sin adivinar). Cada spot y cada
 * actividad se usan una sola vez, para que las notas fotográficas aparezcan
 * cerca de su momento y nunca todas juntas.
 */
export function assignPhotoSpots(
  activities: Activity[],
  spots: PhotoSpot[] = [],
): Map<string, PhotoSpot> {
  const assigned = new Map<string, PhotoSpot>();
  const usedActivities = new Set<string>();
  for (const spot of spots) {
    const needle = photoSpotNeedle(spot);
    if (needle.length === 0) continue;
    const match = activities.find((activity) => {
      if (usedActivities.has(activity.id)) return false;
      const hay = normalizeTokens(`${activity.title} ${activity.location?.name ?? ""} ${activity.category ?? ""}`);
      return needle.some((token) => hay.includes(token));
    });
    if (match) {
      assigned.set(match.id, spot);
      usedActivities.add(match.id);
    }
  }
  return assigned;
}
