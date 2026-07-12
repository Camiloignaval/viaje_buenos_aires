// Traduce el estado agregado (readiness) a lo que muestra la insignia discreta.
// Función pura, testable sin DOM. Port 1:1 de describeBadge (connectedStatusBadge.js).

import { ReadinessStatus } from "./status";
import type { ReadinessState } from "./status";

export type BadgeTone = "loading" | "error" | "success";

export interface BadgeView {
  text: string;
  tone: BadgeTone;
}

export function describeBadge(readinessState: ReadinessState): BadgeView | null {
  if (readinessState.status === ReadinessStatus.LOCAL) {
    return null;
  }
  if (readinessState.status === ReadinessStatus.LOADING) {
    return { text: "Conectando viaje…", tone: "loading" };
  }
  if (readinessState.status === ReadinessStatus.ERROR) {
    return { text: "No pudimos conectar este viaje", tone: "error" };
  }
  // ready, partial y empty son variantes de "conectado sin error" — la insignia
  // es deliberadamente discreta, no expone esa distinción técnica.
  return { text: "Viaje conectado", tone: "success" };
}
