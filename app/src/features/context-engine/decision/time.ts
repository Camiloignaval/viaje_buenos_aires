import type { DecisionWindow } from "./contracts";

export type WindowState = "active" | "outside" | "invalid";

export function resolveWindowState(window: DecisionWindow, now: Date): WindowState {
  const validFrom = Date.parse(window.validFrom);
  const validUntil = Date.parse(window.validUntil);
  const effectiveAt = Date.parse(window.effectiveAt);
  const expiresAt = Date.parse(window.expiresAt);
  const nowMs = now.getTime();
  if (
    !Number.isFinite(nowMs)
    || ![validFrom, validUntil, effectiveAt, expiresAt].every(Number.isFinite)
    || validUntil <= validFrom
    || expiresAt <= validFrom
    || effectiveAt < validFrom
    || effectiveAt > validUntil
  ) return "invalid";
  return nowMs >= validFrom && nowMs < validUntil && nowMs < expiresAt ? "active" : "outside";
}
