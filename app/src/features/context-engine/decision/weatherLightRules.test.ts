import { describe, expect, it } from "vitest";
import type { DecisionInput, NormalizedActivityCandidate } from "./contracts";
import { createContextDecisionRun } from "./engine";
import { DECISION_RULES, WEATHER_ATTENTION_PRECIPITATION_PERCENT } from "./rules";

const TIMEZONE = "America/Argentina/Buenos_Aires";
const WEATHER_NOW = "2026-10-03T15:00:00.000Z";
const LIGHT_NOW = "2026-10-03T09:15:00.000Z";
const weatherRule = DECISION_RULES[3];
const lightRule = DECISION_RULES[4];

function activity(overrides: Partial<NormalizedActivityCandidate> = {}): NormalizedActivityCandidate {
  return {
    activityId: "activity-curated",
    intelligence: { outdoor: true, indoor: false, rainFriendly: false, photoMoment: false },
    window: {
      validFrom: "2026-10-03T14:30:00.000Z",
      validUntil: "2026-10-03T16:00:00.000Z",
      timezone: TIMEZONE,
    },
    ...overrides,
  };
}

function decisionInput({
  weather = {},
  activities = [activity()],
  financialAvailable = false,
}: {
  weather?: Record<string, unknown>;
  activities?: readonly NormalizedActivityCandidate[];
  financialAvailable?: boolean;
} = {}): DecisionInput {
  const availableModule = {
    status: "available" as const,
    value: null,
    reason: null,
    freshness: "fresh" as const,
    provenance: { owner: "trip" as const, source: "fixture", observedAt: WEATHER_NOW },
  };
  const weatherModule = {
    status: "available" as const,
    value: {
      condition: "rain" as const,
      temperatureC: 17,
      precipitationProbability: 80,
      isRaining: true,
      isStorm: false,
      isSnow: false,
      sunrise: { localDateTime: "2026-10-03T06:30", timezone: TIMEZONE },
      sunset: { localDateTime: "2026-10-03T19:00", timezone: TIMEZONE },
      effectiveAt: { localDateTime: "2026-10-03T11:30", timezone: TIMEZONE },
      expiresAt: "2026-10-03T15:15:00.000Z",
      confidence: "unknown" as const,
    },
    reason: null,
    freshness: "fresh" as const,
    provenance: { owner: "adapter" as const, source: "weather.provider", observedAt: WEATHER_NOW },
    ...weather,
  };
  const financial = financialAvailable
    ? availableModule
    : {
        ...availableModule,
        status: "unavailable" as const,
        value: null,
        reason: "financial_failed" as const,
        freshness: "unavailable" as const,
      };
  return {
    tripId: "trip-private",
    context: {
      resolvedAt: WEATHER_NOW,
      destination: availableModule,
      temporal: {
        ...availableModule,
        value: {
          startDateTime: "2026-10-03",
          endDateTime: "2026-10-08",
          timezone: TIMEZONE,
          state: { kind: "today" as const },
        },
      },
      financial,
      narrative: availableModule,
      weather: weatherModule as DecisionInput["context"]["weather"],
      capabilities: { destination: true, temporal: true, financial: financialAvailable, narrative: true, weather: true },
    },
    preferences: { enabled: true, beforeTrip: true, duringTrip: true },
    processedKeys: new Set<string>(),
    activities,
  };
}

function runWeather(input = decisionInput(), now = WEATHER_NOW) {
  return createContextDecisionRun(input, { now: () => new Date(now), rules: [weatherRule] });
}

function runLight(input = decisionInput(), now = LIGHT_NOW) {
  return createContextDecisionRun(input, { now: () => new Date(now), rules: [lightRule] });
}

describe("Weather decision rule", () => {
  it("actúa ante lluvia coherente sobre una actividad outdoor curada y usa la intersección exacta", () => {
    const run = runWeather();

    expect(run.selected).toMatchObject({
      ruleId: "weather-attention-candidate",
      kind: "weather_attention_candidate",
      category: "weather_attention",
      priority: "high",
      dedupeKey: "trip-private:weather_attention_candidate:activity-curated:2026-10-03",
      window: {
        validFrom: "2026-10-03T14:30:00.000Z",
        validUntil: "2026-10-03T15:15:00.000Z",
        expiresAt: "2026-10-03T15:15:00.000Z",
      },
      payload: { attentionSignal: "weather", activityCandidate: "curated" },
    });
    expect(run.selected?.evidence).toEqual([
      { kind: "module", state: "available" },
      { kind: "freshness", state: "fresh" },
      { kind: "activity_metadata", state: "present" },
      { kind: "signal", state: "coherent" },
      { kind: "window", state: "inside" },
    ]);
    expect(run.selected?.freshness).toEqual([{ module: "weather", state: "fresh" }]);
    expect(Object.keys(run.selected?.payload ?? {}).sort()).toEqual(["activityCandidate", "attentionSignal"]);
  });

  it("triangula el umbral nombrado y conserva una identidad estable aunque cambie el instante incidental", () => {
    const first = runWeather(decisionInput({
      weather: { value: {
        ...decisionInput().context.weather.value!,
        condition: "clear",
        precipitationProbability: WEATHER_ATTENTION_PRECIPITATION_PERCENT,
        isRaining: false,
      } },
    }));
    const second = runWeather(decisionInput({
      weather: { value: {
        ...decisionInput().context.weather.value!,
        condition: "clear",
        precipitationProbability: WEATHER_ATTENTION_PRECIPITATION_PERCENT,
        isRaining: false,
        effectiveAt: { localDateTime: "2026-10-03T11:45", timezone: TIMEZONE },
      } },
    }), "2026-10-03T15:05:00.000Z");

    expect(first.selected?.kind).toBe("weather_attention_candidate");
    expect(second.selected?.dedupeKey).toBe(first.selected?.dedupeKey);
  });

  it("abstiene actividades indoor, sin metadata curada o con id inexistente", () => {
    const indoor = runWeather(decisionInput({ activities: [activity({ intelligence: { indoor: true, outdoor: false, rainFriendly: false } })] }));
    const missingMetadata = runWeather(decisionInput({ activities: [activity({ intelligence: {} })] }));
    const missingActivity = runWeather(decisionInput({ activities: [activity({ activityId: "" })] }));

    expect(indoor.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "missing_activity_metadata" });
    expect(missingMetadata.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "missing_activity_metadata" });
    expect(missingActivity.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "invalid_context" });
  });

  it("abstiene Weather stale, unavailable o vencido", () => {
    const stale = runWeather(decisionInput({ weather: { freshness: "stale" } }));
    const unavailableInput = decisionInput({ weather: { status: "unavailable", value: null, reason: "weather_failed", freshness: "unavailable" } });
    const unavailable = runWeather({
      ...unavailableInput,
      context: { ...unavailableInput.context, capabilities: { ...unavailableInput.context.capabilities, weather: false } },
    });
    const expired = runWeather(decisionInput({ weather: { value: {
      ...decisionInput().context.weather.value!,
      expiresAt: "2026-10-03T15:00:00.000Z",
    } } }));

    expect(stale.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "module_stale", staleModules: ["weather"] });
    expect(unavailable.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "missing_capability", missingCapabilities: ["weather"] });
    expect(expired.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "module_stale", staleModules: ["weather"] });
  });

  it("abstiene señal débil, evidencia contradictoria y ventanas fuera o inválidas", () => {
    const weak = runWeather(decisionInput({ weather: { value: {
      ...decisionInput().context.weather.value!, condition: "clear", precipitationProbability: WEATHER_ATTENTION_PRECIPITATION_PERCENT - 1, isRaining: false,
    } } }));
    const conflicting = runWeather(decisionInput({ weather: { value: {
      ...decisionInput().context.weather.value!, condition: "clear", precipitationProbability: 80, isRaining: true,
    } } }));
    const future = runWeather(decisionInput({ activities: [activity({ window: {
      validFrom: "2026-10-03T16:00:00.000Z", validUntil: "2026-10-03T17:00:00.000Z", timezone: TIMEZONE,
    } })] }));
    const invalid = runWeather(decisionInput({ activities: [activity({ window: {
      validFrom: "free text: after lunch", validUntil: "free text: before dinner", timezone: TIMEZONE,
    } })] }));

    expect(weak.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "weak_signal" });
    expect(conflicting.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "conflicting_signals", conflictingSignals: ["weather_signal"] });
    expect(future.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "outside_effective_window" });
    expect(invalid.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "invalid_context" });
  });

  it("no depende de Financial y una falla Weather no detiene decisiones temporales", () => {
    const financialFailure = runWeather(decisionInput({ financialAvailable: false }));
    const unavailableInput = decisionInput({ weather: { status: "unavailable", value: null, reason: "weather_failed", freshness: "unavailable" } });
    const partial = {
      ...unavailableInput,
      context: { ...unavailableInput.context, capabilities: { ...unavailableInput.context.capabilities, weather: false } },
    };
    const temporalRun = createContextDecisionRun(partial, {
      now: () => new Date(WEATHER_NOW),
      rules: [DECISION_RULES[1], weatherRule],
    });

    expect(financialFailure.selected?.kind).toBe("weather_attention_candidate");
    expect(temporalRun.selected?.kind).toBe("trip_start_today");
    expect(temporalRun.evaluations[1]).toMatchObject({ outcome: "abstain", reasonCode: "missing_capability" });
  });

  it("la Story productiva sin candidatos normalizados se abstiene y no interpreta texto libre", () => {
    const productStoryInput = {
      ...decisionInput({ activities: [] }),
      storyHints: { timeWindow: "después de la lluvia", bestMoment: "atardecer" },
    } as DecisionInput;
    const run = runWeather(productStoryInput);

    expect(run.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "incomplete_context" });
    expect(run.selected).toBeNull();
  });
});

describe("Light decision rule", () => {
  function lightInput(overrides: Parameters<typeof decisionInput>[0] = {}): DecisionInput {
    return decisionInput({
      ...overrides,
      activities: overrides.activities ?? [activity({
        intelligence: { outdoor: true, indoor: false, rainFriendly: false, photoMoment: true },
        window: { validFrom: "2026-10-03T09:00:00.000Z", validUntil: "2026-10-03T10:00:00.000Z", timezone: TIMEZONE },
      })],
      weather: {
        value: {
          ...decisionInput().context.weather.value!,
          condition: "clear",
          precipitationProbability: 0,
          isRaining: false,
          effectiveAt: { localDateTime: "2026-10-03T06:00", timezone: TIMEZONE },
          expiresAt: "2026-10-03T10:30:00.000Z",
        },
        ...(overrides.weather ?? {}),
      },
    });
  }

  it("actúa en una intersección razonable con sunrise fresh y metadata photoMoment explícita", () => {
    const run = runLight(lightInput());

    expect(run.selected).toMatchObject({
      ruleId: "light-moment-candidate",
      kind: "light_moment_candidate",
      category: "light_moment",
      dedupeKey: "trip-private:light_moment_candidate:activity-curated:2026-10-03:sunrise",
      window: {
        validFrom: "2026-10-03T09:00:00.000Z",
        validUntil: "2026-10-03T10:00:00.000Z",
        expiresAt: "2026-10-03T10:00:00.000Z",
      },
      payload: { attentionSignal: "light", activityCandidate: "curated" },
    });
    const shiftedProviderMinute = runLight(lightInput({ weather: { value: {
      ...lightInput().context.weather.value!,
      sunrise: { localDateTime: "2026-10-03T06:35", timezone: TIMEZONE },
    } } }));
    expect(shiftedProviderMinute.selected?.dedupeKey).toBe(run.selected?.dedupeKey);
  });

  it("triangula sunset como segundo momento de luz sin cambiar la forma del payload", () => {
    const input = lightInput({
      activities: [activity({
        intelligence: { photoMoment: true },
        window: { validFrom: "2026-10-03T21:30:00.000Z", validUntil: "2026-10-03T22:30:00.000Z", timezone: TIMEZONE },
      })],
      weather: { value: {
        ...decisionInput().context.weather.value!,
        condition: "clear",
        precipitationProbability: 0,
        isRaining: false,
        effectiveAt: { localDateTime: "2026-10-03T18:30", timezone: TIMEZONE },
        expiresAt: "2026-10-03T23:00:00.000Z",
      } },
    });
    const run = runLight(input, "2026-10-03T22:00:00.000Z");

    expect(run.selected).toMatchObject({
      kind: "light_moment_candidate",
      dedupeKey: "trip-private:light_moment_candidate:activity-curated:2026-10-03:sunset",
      payload: { attentionSignal: "light", activityCandidate: "curated" },
    });
  });

  it("abstiene sin photoMoment, con light stale o con sunrise/sunset faltantes", () => {
    const missingMetadata = runLight(lightInput({ activities: [activity({
      intelligence: {},
      window: { validFrom: "2026-10-03T09:00:00.000Z", validUntil: "2026-10-03T10:00:00.000Z", timezone: TIMEZONE },
    })] }));
    const stale = runLight(lightInput({ weather: { freshness: "stale" } }));
    const missingLight = runLight(lightInput({ weather: { value: {
      ...lightInput().context.weather.value!, sunrise: null, sunset: null,
    } } }));

    expect(missingMetadata.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "missing_activity_metadata" });
    expect(stale.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "module_stale", staleModules: ["weather"] });
    expect(missingLight.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "incomplete_context" });
  });

  it("abstiene cuando la ventana de luz ya pasó, no intersecta o llegó como texto libre", () => {
    const past = runLight(lightInput(), "2026-10-03T10:00:00.000Z");
    const noIntersection = runLight(lightInput({ activities: [activity({
      intelligence: { photoMoment: true },
      window: { validFrom: "2026-10-03T15:00:00.000Z", validUntil: "2026-10-03T16:00:00.000Z", timezone: TIMEZONE },
    })] }));
    const freeText = runLight(lightInput({ activities: [activity({
      intelligence: { photoMoment: true },
      window: { validFrom: "bestMoment: sunrise", validUntil: "timeWindow: morning", timezone: TIMEZONE },
    })] }));

    expect(past.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "outside_effective_window" });
    expect(noIntersection.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "outside_effective_window" });
    expect(freeText.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "invalid_context" });
  });
});
