import type { DecisionKind, DecisionPriority } from "../decision";
import type { CompanionChannel, CompanionHistoryEntry } from "./contracts";

export const BASE_INTERVAL_MS = 6 * 60 * 60 * 1_000;
export const DISTINCT_HIGH_INTERVAL_MS = 60 * 60 * 1_000;

const PRIORITIES = new Set<DecisionPriority>(["high", "normal", "low"]);
const CHANNEL_BY_KIND = Object.freeze({
  trip_start_tomorrow: "timeline",
  trip_start_today: "in_app",
  trip_last_day: "memory",
  weather_attention_candidate: "push",
  light_moment_candidate: "editorial",
} satisfies Readonly<Record<DecisionKind, CompanionChannel>>);

export interface ValidatedCompanionHistory {
  readonly dedupeKeys: ReadonlySet<string>;
  readonly latestProcessedAtMs: number | null;
  readonly latestHighAtMs: number | null;
}

export type CompanionHistoryValidation =
  | Readonly<{ valid: true; value: ValidatedCompanionHistory }>
  | Readonly<{ valid: false }>;

export type CompanionFrequencyResult =
  | Readonly<{ allowed: true }>
  | Readonly<{
      allowed: false;
      reason: "frequency_limited" | "recent_high_action";
      nextUsefulAt: string;
    }>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseProcessedAt(value: unknown, nowMs: number): number | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed <= nowMs ? parsed : null;
}

export function validateCompanionHistory(
  processedKeys: ReadonlySet<string> | null | undefined,
  history: readonly CompanionHistoryEntry[] | null | undefined,
  nowMs: number,
): CompanionHistoryValidation {
  try {
    const dedupeKeys = new Set<string>();
    if (processedKeys !== null && processedKeys !== undefined) {
      if (!(processedKeys instanceof Set)) return { valid: false };
      for (const key of processedKeys) {
        if (!isNonEmptyString(key)) return { valid: false };
        dedupeKeys.add(key);
      }
    }

    if (history !== null && history !== undefined && !Array.isArray(history)) return { valid: false };
    let latestProcessedAtMs: number | null = null;
    let latestHighAtMs: number | null = null;
    for (const entry of history ?? []) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)
        || !isNonEmptyString(entry.dedupeKey)
        || !PRIORITIES.has(entry.priority)) return { valid: false };
      const processedAtMs = parseProcessedAt(entry.processedAt, nowMs);
      if (processedAtMs === null) return { valid: false };

      dedupeKeys.add(entry.dedupeKey);
      latestProcessedAtMs = latestProcessedAtMs === null
        ? processedAtMs
        : Math.max(latestProcessedAtMs, processedAtMs);
      if (entry.priority === "high") {
        latestHighAtMs = latestHighAtMs === null
          ? processedAtMs
          : Math.max(latestHighAtMs, processedAtMs);
      }
    }

    return {
      valid: true,
      value: Object.freeze({
        dedupeKeys,
        latestProcessedAtMs,
        latestHighAtMs,
      }),
    };
  } catch {
    return { valid: false };
  }
}

function iso(instantMs: number): string {
  return new Date(instantMs).toISOString();
}

export function evaluateCompanionFrequency(
  priority: DecisionPriority,
  history: ValidatedCompanionHistory,
  nowMs: number,
): CompanionFrequencyResult {
  const latestAt = history.latestProcessedAtMs;
  if (latestAt === null || nowMs - latestAt >= BASE_INTERVAL_MS) return { allowed: true };

  if (priority !== "high") {
    return {
      allowed: false,
      reason: "frequency_limited",
      nextUsefulAt: iso(latestAt + BASE_INTERVAL_MS),
    };
  }

  const latestHighAt = history.latestHighAtMs;
  const hasRecentHigh = latestHighAt !== null && nowMs - latestHighAt < DISTINCT_HIGH_INTERVAL_MS;
  const highRetryAt = Math.min(
    latestAt + BASE_INTERVAL_MS,
    Math.max(
      latestAt + DISTINCT_HIGH_INTERVAL_MS,
      latestHighAt === null ? Number.NEGATIVE_INFINITY : latestHighAt + DISTINCT_HIGH_INTERVAL_MS,
    ),
  );
  if (hasRecentHigh) {
    return { allowed: false, reason: "recent_high_action", nextUsefulAt: iso(highRetryAt) };
  }
  if (nowMs - latestAt < DISTINCT_HIGH_INTERVAL_MS) {
    return { allowed: false, reason: "frequency_limited", nextUsefulAt: iso(highRetryAt) };
  }
  return { allowed: true };
}

export function resolveCompanionChannel(kind: unknown): CompanionChannel | null {
  return typeof kind === "string" && Object.hasOwn(CHANNEL_BY_KIND, kind)
    ? CHANNEL_BY_KIND[kind as DecisionKind]
    : null;
}
