import {
  MemoryEngineError,
  type DiscardReason,
  type MemoryAccepted,
  type MemoryClassification,
  type MemoryEngineErrorCode,
  type MemoryRecord,
  type MemoryType,
} from "./contracts";

export type MemoryObservationOutcome = "candidate" | "discard" | "accepted" | "record" | "error";
export type MemoryObservationLifecycle = "candidate" | "accepted" | "persisted" | "remembered" | "archived" | "none";
export type MemoryObservableResult = MemoryClassification | MemoryAccepted | MemoryRecord;

export interface MemoryObservation {
  readonly outcome: MemoryObservationOutcome;
  readonly discardReason: DiscardReason | "none";
  readonly errorCode: MemoryEngineErrorCode | "none";
  readonly category: MemoryType | "none";
  readonly lifecycle: MemoryObservationLifecycle;
  readonly catalogVersion: "editorial-v1" | "none";
  readonly identityVersion: "memory-key-v1" | "none";
  readonly durationMs: number;
}

export type MemoryObserver = (observation: MemoryObservation) => void;
export interface MemoryObserverDependencies {
  readonly observer?: MemoryObserver;
  readonly timingNow?: () => number;
}

function readDependencies(dependencies?: MemoryObserverDependencies): {
  observer: MemoryObserver | undefined;
  timingNow: (() => number) | undefined;
} {
  let observer: MemoryObserver | undefined;
  let timingNow: (() => number) | undefined;
  try { observer = dependencies?.observer; } catch { observer = undefined; }
  try { timingNow = dependencies?.timingNow; } catch { timingNow = undefined; }
  return { observer, timingNow };
}

function readTime(timingNow: (() => number) | undefined): number | undefined {
  if (!timingNow) return undefined;
  try {
    const value = timingNow();
    return Number.isFinite(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function duration(startedAt: number | undefined, timingNow: (() => number) | undefined): number {
  const finishedAt = readTime(timingNow);
  if (startedAt === undefined || finishedAt === undefined) return 0;
  return Math.min(60_000, Math.max(0, finishedAt - startedAt));
}

function emit(observer: MemoryObserver | undefined, observation: MemoryObservation): void {
  if (!observer) return;
  try { observer(Object.freeze(observation)); } catch { /* best effort */ }
}

function observationForResult(result: MemoryObservableResult, durationMs: number): MemoryObservation {
  if ("outcome" in result && result.outcome === "discard") {
    return {
      outcome: "discard",
      discardReason: result.reason,
      errorCode: "none",
      category: result.type ?? "none",
      lifecycle: "none",
      catalogVersion: "none",
      identityVersion: "none",
      durationMs,
    };
  }
  if ("outcome" in result) {
    return {
      outcome: result.outcome,
      discardReason: "none",
      errorCode: "none",
      category: result.type,
      lifecycle: result.lifecycle,
      catalogVersion: result.editorialRef?.catalogVersion === "editorial-v1" ? "editorial-v1" : "none",
      identityVersion: result.dedupe.version,
      durationMs,
    };
  }
  return {
    outcome: "record",
    discardReason: "none",
    errorCode: "none",
    category: result.type,
    lifecycle: result.state,
    catalogVersion: result.editorialRef?.catalogVersion === "editorial-v1" ? "editorial-v1" : "none",
    identityVersion: result.identityVersion,
    durationMs,
  };
}

function observationForError(error: unknown, durationMs: number): MemoryObservation {
  return {
    outcome: "error",
    discardReason: "none",
    errorCode: error instanceof MemoryEngineError ? error.code : "none",
    category: "none",
    lifecycle: "none",
    catalogVersion: "none",
    identityVersion: "none",
    durationMs,
  };
}

export function observeMemoryOperation<T extends MemoryObservableResult>(
  operation: () => T,
  dependencies?: MemoryObserverDependencies,
): T {
  const { observer, timingNow } = readDependencies(dependencies);
  const startedAt = readTime(timingNow);
  try {
    const result = operation();
    emit(observer, observationForResult(result, duration(startedAt, timingNow)));
    return result;
  } catch (error) {
    emit(observer, observationForError(error, duration(startedAt, timingNow)));
    throw error;
  }
}

export async function observeMemoryOperationAsync<T extends MemoryObservableResult>(
  operation: () => Promise<T>,
  dependencies?: MemoryObserverDependencies,
): Promise<T> {
  const { observer, timingNow } = readDependencies(dependencies);
  const startedAt = readTime(timingNow);
  try {
    const result = await operation();
    emit(observer, observationForResult(result, duration(startedAt, timingNow)));
    return result;
  } catch (error) {
    emit(observer, observationForError(error, duration(startedAt, timingNow)));
    throw error;
  }
}
