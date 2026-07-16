import type { NormalizedActivityCandidate, DecisionKind } from "@/features/context-engine/decision";

const INTELLIGENCE_KEYS = ["outdoor", "indoor", "rainFriendly", "photoMoment"] as const;
const WINDOW_KEYS = ["validFrom", "validUntil", "timezone"] as const;

type AdaptiveDecisionKind = Extract<DecisionKind, "weather_attention_candidate" | "light_moment_candidate">;

const CONTEXTUAL_AUTHORIZATION = Object.freeze({
  surface: "active_story_chapter" as const,
  destination: "in_app" as const,
  references: Object.freeze(["editorial_message"] as const),
});

export type AdaptiveJourneyActivity = Readonly<{
  candidate: NormalizedActivityCandidate;
  authorization: Readonly<{
    surface: "active_story_chapter";
    destination: "in_app";
    references: readonly ["editorial_message"];
    kinds: readonly AdaptiveDecisionKind[];
  }>;
}>;

export function authorizeAdaptiveDecisionSurface(kind: unknown): AdaptiveJourneyActivity["authorization"] | null {
  if (kind !== "weather_attention_candidate" && kind !== "light_moment_candidate") return null;
  const authorizedKind: AdaptiveDecisionKind = kind;
  return Object.freeze({
    ...CONTEXTUAL_AUTHORIZATION,
    kinds: Object.freeze([authorizedKind]),
  });
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  const allowed = new Set(keys);
  return actual.length === keys.length && actual.every((key) => allowed.has(key));
}

function iso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function iana(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || (!value.includes("/") && value !== "UTC")) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function adaptStoryActivity(value: unknown): AdaptiveJourneyActivity | null {
  try {
    const activity = record(value);
    const intelligence = record(activity?.intelligence);
    const window = record(activity?.contextWindow);
    if (!activity || typeof activity.id !== "string" || activity.id.trim().length === 0
      || !intelligence || !window
      || !exact(intelligence, INTELLIGENCE_KEYS) || !exact(window, WINDOW_KEYS)
      || !INTELLIGENCE_KEYS.every((key) => typeof intelligence[key] === "boolean")
      || intelligence.indoor === true && intelligence.outdoor === true
      || !iso(window.validFrom) || !iso(window.validUntil)
      || Date.parse(window.validUntil) <= Date.parse(window.validFrom)
      || !iana(window.timezone)) return null;

    const kinds: AdaptiveDecisionKind[] = [];
    if (intelligence.outdoor === true && intelligence.indoor === false && intelligence.rainFriendly === false) {
      kinds.push("weather_attention_candidate");
    }
    if (intelligence.photoMoment === true) kinds.push("light_moment_candidate");
    if (kinds.length === 0) return null;

    const candidate: NormalizedActivityCandidate = Object.freeze({
      activityId: activity.id,
      intelligence: Object.freeze({
        outdoor: intelligence.outdoor as boolean,
        indoor: intelligence.indoor as boolean,
        rainFriendly: intelligence.rainFriendly as boolean,
        photoMoment: intelligence.photoMoment as boolean,
      }),
      window: Object.freeze({
        validFrom: window.validFrom,
        validUntil: window.validUntil,
        timezone: window.timezone,
      }),
    });
    return Object.freeze({
      candidate,
      authorization: Object.freeze({
        ...CONTEXTUAL_AUTHORIZATION,
        kinds: Object.freeze(kinds),
      }),
    });
  } catch {
    return null;
  }
}
