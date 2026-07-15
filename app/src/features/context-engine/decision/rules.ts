import { safeTripTemporalState, type TripTemporalState } from "@/features/trips/lib/countdown";
import type {
  AbstainDecisionDraft,
  ActDecisionDraft,
  DecisionKind,
  DecisionReason,
  DecisionRule,
  RuleEvaluationDraft,
} from "./contracts";
import type { WeatherContext } from "../types";
import {
  normalizedCalendarDate,
  resolveDestinationLocalDate,
  resolveDestinationLocalDateTime,
  resolveDestinationLocalDayWindow,
} from "./time";

export const WEATHER_ATTENTION_PRECIPITATION_PERCENT = 60;
const LIGHT_MOMENT_RADIUS_MS = 60 * 60 * 1_000;

const WEATHER_LIGHT_REASONS = Object.freeze([
  "actionable",
  "incomplete_context",
  "missing_capability",
  "module_unavailable",
  "module_stale",
  "missing_activity_metadata",
  "weak_signal",
  "outside_effective_window",
  "preference_disabled",
  "already_processed",
  "conflicting_signals",
  "invalid_context",
] as const satisfies readonly DecisionReason[]);
const TEMPORAL_REASONS = Object.freeze([
  "actionable",
  "invalid_context",
  "trip_finished",
  "trip_not_applicable",
  "already_processed",
  "outside_effective_window",
] as const satisfies readonly DecisionReason[]);

function defineRule(rule: DecisionRule): DecisionRule {
  return Object.freeze(rule);
}

function dynamicAbstention(
  reasonCode: AbstainDecisionDraft["reasonCode"],
  details: Partial<AbstainDecisionDraft> = {},
): AbstainDecisionDraft {
  return Object.freeze({
    outcome: "abstain",
    reasonCode,
    confidence: details.confidence ?? "insufficient",
    evidence: Object.freeze([...(details.evidence ?? [{ kind: "signal", state: "missing" }])]),
    freshness: Object.freeze([...(details.freshness ?? [])]),
    missingCapabilities: Object.freeze([...(details.missingCapabilities ?? [])]),
    missingModules: Object.freeze([...(details.missingModules ?? [])]),
    staleModules: Object.freeze([...(details.staleModules ?? [])]),
    conflictingSignals: Object.freeze([...(details.conflictingSignals ?? [])]),
    nextUsefulEvaluationAt: details.nextUsefulEvaluationAt ?? null,
    dedupeKey: details.dedupeKey,
    window: details.window ? Object.freeze({ ...details.window }) : details.window,
  });
}

function weatherCoherent(weather: WeatherContext): boolean {
  if (
    !Number.isFinite(weather.temperatureC)
    || (weather.precipitationProbability !== null && (
      !Number.isFinite(weather.precipitationProbability)
      || weather.precipitationProbability < 0
      || weather.precipitationProbability > 100
    ))
    || typeof weather.isRaining !== "boolean"
    || typeof weather.isStorm !== "boolean"
    || typeof weather.isSnow !== "boolean"
  ) return false;
  const conditionFlags: Readonly<Record<WeatherContext["condition"], readonly [boolean, boolean, boolean]>> = {
    clear: [false, false, false],
    cloudy: [false, false, false],
    fog: [false, false, false],
    rain: [true, false, false],
    storm: [true, true, false],
    snow: [false, false, true],
    freezing: [true, false, false],
    unknown: [false, false, false],
  };
  const expected = conditionFlags[weather.condition];
  return Boolean(expected)
    && weather.isRaining === expected[0]
    && weather.isStorm === expected[1]
    && weather.isSnow === expected[2];
}

function validActivityWindow(activity: Parameters<DecisionRule["evaluate"]>[0]["activities"][number]) {
  const validFrom = Date.parse(activity.window.validFrom);
  const validUntil = Date.parse(activity.window.validUntil);
  if (!activity.activityId.trim() || !resolveDestinationLocalDate(new Date(validFrom), activity.window.timezone)) return null;
  if (!Number.isFinite(validFrom) || !Number.isFinite(validUntil) || validUntil <= validFrom) return null;
  return { validFrom, validUntil };
}

type WeatherBase =
  | Readonly<{ ok: false; abstention: AbstainDecisionDraft }>
  | Readonly<{
      ok: true;
      weather: WeatherContext;
      freshness: AbstainDecisionDraft["freshness"];
      effectiveAt: number;
      expiresAt: number;
    }>;

function weatherBase(input: Parameters<DecisionRule["evaluate"]>[0], now: Date): WeatherBase {
  const module = input.context.weather;
  const freshness = Object.freeze([{ module: "weather" as const, state: module.freshness }]);
  if (module.freshness !== "fresh") {
    return { ok: false, abstention: dynamicAbstention("module_stale", { freshness, staleModules: ["weather"] }) };
  }
  const weather = module.value;
  if (!weather) return { ok: false, abstention: dynamicAbstention("incomplete_context", { freshness }) };
  const expiresAt = Date.parse(weather.expiresAt);
  const effectiveAt = resolveDestinationLocalDateTime(weather.effectiveAt.localDateTime, weather.effectiveAt.timezone);
  if (!Number.isFinite(now.getTime()) || !effectiveAt || !Number.isFinite(expiresAt) || expiresAt <= effectiveAt.getTime()) {
    return { ok: false, abstention: dynamicAbstention("invalid_context", { freshness }) };
  }
  if (now.getTime() >= expiresAt) {
    return { ok: false, abstention: dynamicAbstention("module_stale", { freshness, staleModules: ["weather"] }) };
  }
  return { ok: true, weather, freshness, effectiveAt: effectiveAt.getTime(), expiresAt };
}

function intersection(
  left: Readonly<{ validFrom: number; validUntil: number }>,
  right: Readonly<{ validFrom: number; validUntil: number }>,
) {
  const validFrom = Math.max(left.validFrom, right.validFrom);
  const validUntil = Math.min(left.validUntil, right.validUntil);
  return validUntil > validFrom ? { validFrom, validUntil } : null;
}

function actWindow(bounds: Readonly<{ validFrom: number; validUntil: number }>, now: Date) {
  return Object.freeze({
    validFrom: new Date(bounds.validFrom).toISOString(),
    validUntil: new Date(bounds.validUntil).toISOString(),
    effectiveAt: now.toISOString(),
    expiresAt: new Date(bounds.validUntil).toISOString(),
  });
}

function evaluateWeatherRule(input: Parameters<DecisionRule["evaluate"]>[0], now: Date): readonly RuleEvaluationDraft[] {
  const base = weatherBase(input, now);
  if (!base.ok) return [base.abstention];
  if (input.activities.length === 0) return [dynamicAbstention("incomplete_context", { freshness: base.freshness })];
  if (!weatherCoherent(base.weather)) {
    return [dynamicAbstention("conflicting_signals", {
      freshness: base.freshness,
      evidence: [{ kind: "signal", state: "conflicting" }],
      conflictingSignals: ["weather_signal"],
    })];
  }
  const relevantSignal = base.weather.isRaining
    || base.weather.isStorm
    || base.weather.isSnow
    || (base.weather.precipitationProbability ?? -1) >= WEATHER_ATTENTION_PRECIPITATION_PERCENT;
  if (!relevantSignal) return [dynamicAbstention("weak_signal", { freshness: base.freshness })];

  return input.activities.map((activity) => {
    const activityWindow = validActivityWindow(activity);
    if (!activityWindow || activity.window.timezone !== base.weather.effectiveAt.timezone) {
      return dynamicAbstention("invalid_context", { freshness: base.freshness });
    }
    if (activity.intelligence.outdoor !== true || activity.intelligence.indoor === true || activity.intelligence.rainFriendly !== false) {
      return dynamicAbstention("missing_activity_metadata", {
        freshness: base.freshness,
        evidence: [{ kind: "activity_metadata", state: "missing" }],
      });
    }
    const bounds = intersection(activityWindow, { validFrom: base.effectiveAt, validUntil: base.expiresAt });
    if (!bounds || now.getTime() < bounds.validFrom || now.getTime() >= bounds.validUntil) {
      return dynamicAbstention("outside_effective_window", {
        freshness: base.freshness,
        evidence: [{ kind: "window", state: "outside" }],
      });
    }
    const localDate = resolveDestinationLocalDate(new Date(bounds.validFrom), activity.window.timezone);
    if (!localDate) return dynamicAbstention("invalid_context", { freshness: base.freshness });
    const draft: ActDecisionDraft = {
      outcome: "act",
      kind: "weather_attention_candidate",
      category: "weather_attention",
      reasonCode: "actionable",
      confidence: "sufficient",
      evidence: Object.freeze([
        { kind: "module", state: "available" },
        { kind: "freshness", state: "fresh" },
        { kind: "activity_metadata", state: "present" },
        { kind: "signal", state: "coherent" },
        { kind: "window", state: "inside" },
      ]),
      freshness: base.freshness,
      dedupeKey: `${input.tripId}:weather_attention_candidate:${activity.activityId}:${localDate}`,
      window: actWindow(bounds, now),
      payload: Object.freeze({ attentionSignal: "weather", activityCandidate: "curated" }),
    };
    return Object.freeze(draft);
  });
}

function evaluateLightRule(input: Parameters<DecisionRule["evaluate"]>[0], now: Date): readonly RuleEvaluationDraft[] {
  const base = weatherBase(input, now);
  if (!base.ok) return [base.abstention];
  if (input.activities.length === 0) return [dynamicAbstention("incomplete_context", { freshness: base.freshness })];
  const lightMoments = [
    { kind: "sunrise" as const, value: base.weather.sunrise },
    { kind: "sunset" as const, value: base.weather.sunset },
  ];
  if (lightMoments.some(({ value }) => !value)) {
    return [dynamicAbstention("incomplete_context", { freshness: base.freshness })];
  }
  const effectiveDate = normalizedCalendarDate(base.weather.effectiveAt.localDateTime);
  const normalizedMoments = lightMoments.map(({ kind, value }) => {
    const localDate = value ? normalizedCalendarDate(value.localDateTime) : null;
    if (!value || !effectiveDate || localDate !== effectiveDate || value.timezone !== base.weather.effectiveAt.timezone) return null;
    const instant = resolveDestinationLocalDateTime(value.localDateTime, value.timezone);
    return instant ? { instant: instant.getTime(), kind, localDate } : null;
  });
  if (normalizedMoments.some((moment) => !moment)) {
    return [dynamicAbstention("invalid_context", { freshness: base.freshness })];
  }

  return input.activities.map((activity) => {
    const activityWindow = validActivityWindow(activity);
    if (!activityWindow || activity.window.timezone !== base.weather.effectiveAt.timezone) {
      return dynamicAbstention("invalid_context", { freshness: base.freshness });
    }
    if (activity.intelligence.photoMoment !== true) {
      return dynamicAbstention("missing_activity_metadata", {
        freshness: base.freshness,
        evidence: [{ kind: "activity_metadata", state: "missing" }],
      });
    }
    const candidates = normalizedMoments.flatMap((moment) => {
      if (!moment) return [];
      const lightWindow = {
        validFrom: moment.instant - LIGHT_MOMENT_RADIUS_MS,
        validUntil: moment.instant + LIGHT_MOMENT_RADIUS_MS,
      };
      const weatherLight = intersection(lightWindow, { validFrom: base.effectiveAt, validUntil: base.expiresAt });
      const bounds = weatherLight ? intersection(activityWindow, weatherLight) : null;
      return bounds ? [{ bounds, moment }] : [];
    });
    const active = candidates.find(({ bounds }) => now.getTime() >= bounds.validFrom && now.getTime() < bounds.validUntil);
    if (!active) {
      return dynamicAbstention("outside_effective_window", {
        freshness: base.freshness,
        evidence: [{ kind: "window", state: "outside" }],
      });
    }
    const draft: ActDecisionDraft = {
      outcome: "act",
      kind: "light_moment_candidate",
      category: "light_moment",
      reasonCode: "actionable",
      confidence: "sufficient",
      evidence: Object.freeze([
        { kind: "module", state: "available" },
        { kind: "freshness", state: "fresh" },
        { kind: "activity_metadata", state: "present" },
        { kind: "signal", state: "coherent" },
        { kind: "window", state: "inside" },
      ]),
      freshness: base.freshness,
      dedupeKey: `${input.tripId}:light_moment_candidate:${activity.activityId}:${active.moment.localDate}:${active.moment.kind}`,
      window: actWindow(active.bounds, now),
      payload: Object.freeze({ attentionSignal: "light", activityCandidate: "curated" }),
    };
    return Object.freeze(draft);
  });
}

type TemporalRuleKind = "tomorrow" | "today" | "last-day";
const TEMPORAL_DECISIONS: Readonly<Record<TemporalRuleKind, { kind: DecisionKind; temporalState: "before" | "active" }>> = Object.freeze({
  tomorrow: Object.freeze({ kind: "trip_start_tomorrow", temporalState: "before" }),
  today: Object.freeze({ kind: "trip_start_today", temporalState: "active" }),
  "last-day": Object.freeze({ kind: "trip_last_day", temporalState: "active" }),
});

function temporalAbstention(
  reasonCode: AbstainDecisionDraft["reasonCode"],
  freshness: AbstainDecisionDraft["freshness"] = [],
): readonly RuleEvaluationDraft[] {
  return [Object.freeze({
    outcome: "abstain",
    reasonCode,
    confidence: "insufficient",
    evidence: Object.freeze([{ kind: "signal", state: reasonCode === "invalid_context" ? "conflicting" : "missing" }] as const),
    freshness: Object.freeze([...freshness]),
    missingCapabilities: Object.freeze([]),
    missingModules: Object.freeze([]),
    staleModules: Object.freeze([]),
    conflictingSignals: Object.freeze(reasonCode === "invalid_context" ? ["temporal_input"] : []),
    nextUsefulEvaluationAt: null,
  })];
}

function temporalStateApplies(kind: TemporalRuleKind, state: TripTemporalState, localDate: string, endDate: string): boolean {
  if (kind === "tomorrow") return state.kind === "tomorrow";
  if (kind === "today") return state.kind === "today";
  return localDate === endDate && (
    state.kind === "today"
    || (state.kind === "in-progress" && state.isLastDay)
  );
}

function evaluateTemporalRule(kind: TemporalRuleKind) {
  return (input: Parameters<DecisionRule["evaluate"]>[0], now: Date): readonly RuleEvaluationDraft[] => {
    const temporal = input.context.temporal.value;
    if (!temporal || !Number.isFinite(now.getTime())) return temporalAbstention("invalid_context");
    const startDate = normalizedCalendarDate(temporal.startDateTime);
    const endDate = normalizedCalendarDate(temporal.endDateTime);
    const dayWindow = resolveDestinationLocalDayWindow(now, temporal.timezone);
    if (!startDate || !endDate || startDate > endDate || !dayWindow) return temporalAbstention("invalid_context");

    // The persisted temporal state can be stale; only a state rederived for this exact injected clock is trusted.
    const state = safeTripTemporalState(now, temporal.startDateTime, temporal.endDateTime, temporal.timezone);
    const freshness = Object.freeze([{ module: "temporal" as const, state: input.context.temporal.freshness }]);
    if (!state) return temporalAbstention("invalid_context", freshness);
    if (!temporalStateApplies(kind, state, dayWindow.localDate, endDate)) {
      const reason = kind === "last-day" && (state.kind === "just-finished" || state.kind === "memory")
        ? "trip_finished"
        : "trip_not_applicable";
      return temporalAbstention(reason, freshness);
    }

    const selected = TEMPORAL_DECISIONS[kind];
    const eventDate = kind === "last-day" ? endDate : startDate;
    const draft: ActDecisionDraft = {
      outcome: "act",
      kind: selected.kind,
      category: "trip_lifecycle",
      reasonCode: "actionable",
      confidence: "sufficient",
      evidence: Object.freeze([
        { kind: "module", state: "available" },
        { kind: "signal", state: "coherent" },
        { kind: "window", state: "inside" },
      ]),
      freshness,
      dedupeKey: `${input.tripId}:${selected.kind}:${eventDate}`,
      window: Object.freeze({
        validFrom: dayWindow.validFrom,
        validUntil: dayWindow.validUntil,
        effectiveAt: now.toISOString(),
        expiresAt: dayWindow.validUntil,
      }),
      payload: Object.freeze({ attentionSignal: "trip_lifecycle", temporalState: selected.temporalState }),
    };
    return [Object.freeze(draft)];
  };
}

export const DECISION_RULES: readonly DecisionRule[] = Object.freeze([
  defineRule({
    id: "trip-start-tomorrow",
    purpose: "Evaluate whether the trip starts tomorrow in destination-local time.",
    enables: Object.freeze(["trip_start_tomorrow"]),
    requiredCapabilities: Object.freeze(["temporal"]),
    requiredModules: Object.freeze(["temporal"]),
    priority: "low",
    preference: "before_trip",
    freshnessPolicy: "derived_temporal",
    abstainReasons: TEMPORAL_REASONS,
    evaluate: evaluateTemporalRule("tomorrow"),
  }),
  defineRule({
    id: "trip-start-today",
    purpose: "Evaluate whether the trip starts today in destination-local time.",
    enables: Object.freeze(["trip_start_today"]),
    requiredCapabilities: Object.freeze(["temporal"]),
    requiredModules: Object.freeze(["temporal"]),
    priority: "normal",
    preference: "during_trip",
    freshnessPolicy: "derived_temporal",
    abstainReasons: TEMPORAL_REASONS,
    evaluate: evaluateTemporalRule("today"),
  }),
  defineRule({
    id: "last-day",
    purpose: "Evaluate whether today is the trip's last destination-local day.",
    enables: Object.freeze(["trip_last_day"]),
    requiredCapabilities: Object.freeze(["temporal"]),
    requiredModules: Object.freeze(["temporal"]),
    priority: "normal",
    preference: "during_trip",
    freshnessPolicy: "derived_temporal",
    abstainReasons: TEMPORAL_REASONS,
    evaluate: evaluateTemporalRule("last-day"),
  }),
  defineRule({
    id: "weather-attention-candidate",
    purpose: "Evaluate curated activities against coherent fresh weather.",
    enables: Object.freeze(["weather_attention_candidate"]),
    requiredCapabilities: Object.freeze(["weather", "narrative"]),
    requiredModules: Object.freeze(["weather", "narrative"]),
    priority: "high",
    preference: "during_trip",
    freshnessPolicy: "fresh_weather",
    abstainReasons: WEATHER_LIGHT_REASONS,
    evaluate: evaluateWeatherRule,
  }),
  defineRule({
    id: "light-moment-candidate",
    purpose: "Evaluate curated photo moments against coherent fresh light windows.",
    enables: Object.freeze(["light_moment_candidate"]),
    requiredCapabilities: Object.freeze(["weather", "narrative"]),
    requiredModules: Object.freeze(["weather", "narrative"]),
    priority: "normal",
    preference: "during_trip",
    freshnessPolicy: "fresh_weather",
    abstainReasons: WEATHER_LIGHT_REASONS,
    evaluate: evaluateLightRule,
  }),
]);
