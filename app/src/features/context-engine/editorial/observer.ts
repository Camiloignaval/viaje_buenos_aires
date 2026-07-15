import type {
  EditorialCatalogVersion,
  EditorialDecisionKind,
  EditorialErrorCode,
  EditorialVariantId,
} from "./contracts";

export interface EditorialObservation {
  readonly outcome: "success" | "error";
  readonly errorCode: EditorialErrorCode | "none";
  readonly kind: EditorialDecisionKind | "unknown";
  readonly variantId: EditorialVariantId | "none";
  readonly catalogVersion: EditorialCatalogVersion;
  readonly durationMs: number;
}

export type EditorialObserver = (event: Readonly<EditorialObservation>) => void;

export interface EditorialDependencies {
  readonly observer?: EditorialObserver;
  readonly timingNow?: () => number;
}

export function sanitizeEditorialDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs)) return 0;
  return Math.min(60_000, Math.max(0, durationMs));
}

export function emitEditorialObservation(
  observer: EditorialObserver | undefined,
  event: EditorialObservation,
): void {
  if (!observer) return;
  try {
    observer(Object.freeze({ ...event, durationMs: sanitizeEditorialDuration(event.durationMs) }));
  } catch {
    // Observation is deliberately best-effort and cannot affect the editorial contract.
  }
}
