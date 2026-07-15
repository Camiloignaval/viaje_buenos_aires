// Resolución de continuidad al abrir Alaia. Puro y testeable: decide adónde ir
// al lanzar la app. La restauración es silenciosa e invisible (nunca
// "Restaurando..."); la validación real del viaje (existe, hay sesión) la hacen
// los guards y la resolución de la Portada, que degradan con elegancia si el
// contexto cambió.

import type { ContinuityState } from "./continuityStore";

export type LaunchTarget =
  | { kind: "restore"; tripId: string }
  | { kind: "default" };

export interface LaunchInput {
  continuity: ContinuityState | null;
  /** Solo se restaura la continuidad con la app instalada (standalone). */
  standalone: boolean;
  userId?: string | null;
}

export function resolveLaunchTarget({ continuity, standalone, userId }: LaunchInput): LaunchTarget {
  if (standalone && continuity && continuity.tripId && continuity.userId === userId) {
    return { kind: "restore", tripId: continuity.tripId };
  }
  return { kind: "default" };
}

/** ¿Alaia corre instalada (standalone)? No lanza en entornos sin matchMedia. */
export function isStandaloneDisplay(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const byDisplayMode = window.matchMedia?.("(display-mode: standalone)").matches === true;
    const byNavigator = (window.navigator as { standalone?: boolean }).standalone === true;
    return byDisplayMode || byNavigator;
  } catch {
    return false;
  }
}
