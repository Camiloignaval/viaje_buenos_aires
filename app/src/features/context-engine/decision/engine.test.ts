import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type {
  DecisionInput,
  DecisionReason,
  DecisionRule,
  ActDecisionDraft,
  RuleEvaluationDraft,
} from "./contracts";
import { createContextDecisionRun } from "./engine";
import { DECISION_RULES } from "./rules";

const NOW = new Date("2026-10-03T15:00:00.000Z");
const WINDOW = {
  validFrom: "2026-10-03T14:00:00.000Z",
  validUntil: "2026-10-03T16:00:00.000Z",
  effectiveAt: "2026-10-03T15:00:00.000Z",
  expiresAt: "2026-10-03T16:00:00.000Z",
} as const;

function input(overrides: Partial<DecisionInput> = {}): DecisionInput {
  const availableModule = {
    status: "available" as const,
    value: null,
    reason: null,
    freshness: "fresh" as const,
    provenance: { owner: "trip" as const, source: "fixture", observedAt: NOW.toISOString() },
  };
  const unavailableModule = {
    status: "unavailable" as const,
    value: null,
    reason: "missing_financial_input" as const,
    freshness: "unavailable" as const,
    provenance: { owner: "none" as const, source: "none", observedAt: null },
  };
  return {
    tripId: "trip-private",
    context: {
      resolvedAt: NOW.toISOString(),
      destination: availableModule,
      temporal: availableModule,
      financial: unavailableModule,
      narrative: availableModule,
      weather: availableModule,
      capabilities: { destination: true, temporal: true, financial: false, narrative: true, weather: true },
    },
    preferences: { enabled: true, beforeTrip: true, duringTrip: true },
    processedKeys: new Set<string>(),
    activities: [],
    ...overrides,
  };
}

function act(dedupeKey: string, overrides: Partial<ActDecisionDraft> = {}): ActDecisionDraft {
  return {
    outcome: "act",
    kind: "trip_start_today",
    category: "trip_lifecycle",
    reasonCode: "actionable",
    confidence: "sufficient",
    evidence: [{ kind: "signal", state: "present" }],
    freshness: [{ module: "temporal", state: "fresh" }],
    dedupeKey,
    window: WINDOW,
    payload: { attentionSignal: "trip_lifecycle" },
    ...overrides,
  };
}

function abstain(reasonCode: Exclude<DecisionReason, "actionable"> = "incomplete_context"): RuleEvaluationDraft {
  return {
    outcome: "abstain",
    reasonCode,
    confidence: "insufficient",
    evidence: [{ kind: "signal", state: "missing" }],
    freshness: [],
    missingCapabilities: [],
    missingModules: [],
    staleModules: [],
    conflictingSignals: [],
    nextUsefulEvaluationAt: null,
  };
}

function rule(
  id: DecisionRule["id"],
  evaluation: RuleEvaluationDraft | readonly RuleEvaluationDraft[],
  overrides: Partial<DecisionRule> = {},
): DecisionRule {
  return {
    id,
    purpose: `fixture:${id}`,
    enables: ["fixture"],
    requiredCapabilities: [],
    requiredModules: [],
    priority: "normal",
    preference: "always",
    freshnessPolicy: "none",
    abstainReasons: ["incomplete_context"],
    evaluate: () => Array.isArray(evaluation) ? evaluation : [evaluation],
    ...overrides,
  };
}

describe("createContextDecisionRun", () => {
  it("es determinista, usa el reloj inyectado y conserva el orden estable", () => {
    const now = vi.fn(() => new Date(NOW));
    const rules = [
      rule("trip-start-tomorrow", act("trip:start:tomorrow"), { priority: "low" }),
      rule("trip-start-today", abstain()),
    ] as const;

    const first = createContextDecisionRun(input(), { now, rules });
    const second = createContextDecisionRun(input(), { now, rules });

    expect(first).toEqual(second);
    expect(now).toHaveBeenCalledTimes(2);
    expect(first.evaluations.map(({ ruleId }) => ruleId)).toEqual(["trip-start-tomorrow", "trip-start-today"]);
    expect(first.selected?.window.effectiveAt).toBe(NOW.toISOString());
  });

  it("expone las cinco declaraciones nombradas en un orden explícito congelado", () => {
    expect(DECISION_RULES.map(({ id }) => id)).toEqual([
      "trip-start-tomorrow",
      "trip-start-today",
      "last-day",
      "weather-attention-candidate",
      "light-moment-candidate",
    ]);
    expect(Object.isFrozen(DECISION_RULES)).toBe(true);
    expect(DECISION_RULES.every(Object.isFrozen)).toBe(true);
  });

  it("normaliza candidatos por ventana e id sin mutar su orden de entrada", () => {
    const activities = [
      { activityId: "z", intelligence: {}, window: { validFrom: "2026-10-03T16:00:00.000Z", validUntil: "2026-10-03T17:00:00.000Z", timezone: "America/Argentina/Buenos_Aires" } },
      { activityId: "b", intelligence: {}, window: { validFrom: "2026-10-03T14:00:00.000Z", validUntil: "2026-10-03T15:00:00.000Z", timezone: "America/Argentina/Buenos_Aires" } },
      { activityId: "a", intelligence: {}, window: { validFrom: "2026-10-03T14:00:00.000Z", validUntil: "2026-10-03T15:00:00.000Z", timezone: "America/Argentina/Buenos_Aires" } },
    ] as const;
    const seen: string[][] = [];
    const inspectingRule = rule("trip-start-today", abstain(), {
      evaluate: (decisionInput) => {
        seen.push(decisionInput.activities.map(({ activityId }) => activityId));
        return [abstain()];
      },
    });

    createContextDecisionRun(input({ activities }), { now: () => new Date(NOW), rules: [inspectingRule] });

    expect(seen).toEqual([["a", "b", "z"]]);
    expect(activities.map(({ activityId }) => activityId)).toEqual(["z", "b", "a"]);
  });

  it("no muta inputs congelados y devuelve contratos inmutables", () => {
    const frozenInput = Object.freeze({
      ...input(),
      preferences: Object.freeze({ enabled: true, beforeTrip: true, duringTrip: true }),
      activities: Object.freeze([]),
    });
    const run = createContextDecisionRun(frozenInput, {
      now: () => new Date(NOW),
      rules: [rule("trip-start-today", act("trip:start:today"))],
    });

    expect(frozenInput.preferences).toEqual({ enabled: true, beforeTrip: true, duringTrip: true });
    expect(Object.isFrozen(run)).toBe(true);
    expect(Object.isFrozen(run.evaluations)).toBe(true);
    expect(Object.isFrozen(run.evaluations[0])).toBe(true);
  });

  it("devuelve Act seleccionado y abstención global explícita sin copy ni canal", () => {
    const acted = createContextDecisionRun(input(), {
      now: () => new Date(NOW),
      rules: [rule("trip-start-today", act("trip:start:today"))],
    });
    const silent = createContextDecisionRun(input(), {
      now: () => new Date(NOW),
      rules: [rule("trip-start-today", abstain())],
    });

    expect(acted.decision).toMatchObject({ outcome: "act", id: "decision:trip:start:today", reasonCode: "actionable" });
    expect(acted.selected).toEqual(acted.decision);
    expect(JSON.stringify(acted)).not.toMatch(/copy|channel|push/i);
    expect(silent.decision).toMatchObject({ outcome: "abstain", ruleId: "engine", reasonCode: "incomplete_context" });
    expect(silent.selected).toBeNull();
  });

  it("conserva todas las evaluaciones producidas por reglas múltiples", () => {
    const run = createContextDecisionRun(input(), {
      now: () => new Date(NOW),
      rules: [
        rule("trip-start-today", [act("trip:start:today"), abstain("invalid_context")]),
        rule("light-moment-candidate", act("light:moment", {
          kind: "light_moment_candidate",
          category: "light_moment",
        })),
      ],
    });

    expect(run.evaluations).toHaveLength(3);
    expect(run.evaluations.map(({ outcome }) => outcome)).toEqual(["act", "abstain", "act"]);
    expect(run.evaluations.map(({ disposition }) => disposition)).toEqual(["selected", "abstained", "not_selected"]);
  });

  it("aplica capability, módulo parcial y preferencia antes de actuar", () => {
    const gatedRule = rule("weather-attention-candidate", act("weather:activity", {
      kind: "weather_attention_candidate",
      category: "weather_attention",
    }), {
      requiredCapabilities: ["weather"],
      requiredModules: ["weather"],
      preference: "during_trip",
    });

    const missingCapability = createContextDecisionRun(input({
      context: { ...input().context, capabilities: { ...input().context.capabilities, weather: false } },
    }), { now: () => new Date(NOW), rules: [gatedRule] });
    const disabled = createContextDecisionRun(input({
      preferences: { enabled: false, beforeTrip: true, duringTrip: true },
    }), { now: () => new Date(NOW), rules: [gatedRule] });
    const base = input();
    const partial = createContextDecisionRun(input({
      context: {
        ...base.context,
        weather: {
          ...base.context.weather,
          status: "unavailable",
          value: null,
          reason: "weather_failed",
          freshness: "unavailable",
        },
      },
    }), {
      now: () => new Date(NOW),
      rules: [gatedRule, rule("trip-start-today", act("trip:today"))],
    });
    const duringDisabled = createContextDecisionRun(input({
      preferences: { enabled: true, beforeTrip: true, duringTrip: false },
    }), { now: () => new Date(NOW), rules: [gatedRule] });

    expect(missingCapability.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "missing_capability", missingCapabilities: ["weather"] });
    expect(disabled.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "preference_disabled" });
    expect(partial.evaluations).toMatchObject([
      { outcome: "abstain", reasonCode: "module_unavailable", missingModules: ["weather"] },
      { outcome: "act", disposition: "selected" },
    ]);
    expect(duringDisabled.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "preference_disabled" });
  });

  it("abstiene una key ya procesada sin incorporar timestamps a la identidad", () => {
    const dedupeKey = "trip:start:today";
    const run = createContextDecisionRun(input({ processedKeys: new Set([dedupeKey]) }), {
      now: () => new Date(NOW),
      rules: [rule("trip-start-today", act(dedupeKey))],
    });

    expect(run.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "already_processed", dedupeKey });
    expect(JSON.stringify(run.evaluations[0])).not.toContain(NOW.toISOString().slice(0, 10) + `:${dedupeKey}`);
  });

  it("deduplica equivalentes y conserva la primera evaluación estable", () => {
    const rules = [
      rule("trip-start-today", act("trip:lifecycle")),
      rule("last-day", act("trip:lifecycle", { kind: "trip_last_day" })),
    ] as const;
    const run = createContextDecisionRun(input(), { now: () => new Date(NOW), rules });

    expect(run.selected?.ruleId).toBe("trip-start-today");
    expect(run.evaluations[1]).toMatchObject({ outcome: "abstain", disposition: "abstained", reasonCode: "duplicate_candidate" });
  });

  it("resuelve conflictos de categoría por prioridad y orden sin scores", () => {
    const rules = [
      rule("trip-start-tomorrow", act("trip:tomorrow", { kind: "trip_start_tomorrow" }), { priority: "low" }),
      rule("last-day", act("trip:last-day", { kind: "trip_last_day" }), { priority: "normal" }),
      rule("trip-start-today", act("trip:today"), { priority: "normal" }),
    ] as const;
    const run = createContextDecisionRun(input(), { now: () => new Date(NOW), rules });

    expect(run.selected?.ruleId).toBe("last-day");
    expect(run.evaluations.map(({ disposition }) => disposition)).toEqual(["abstained", "selected", "abstained"]);
    expect(JSON.stringify(run)).not.toMatch(/score/i);
  });

  it("mantiene acciones no relacionadas en traza y selecciona solo una", () => {
    const run = createContextDecisionRun(input(), {
      now: () => new Date(NOW),
      rules: [
        rule("trip-start-today", act("trip:today"), { priority: "normal" }),
        rule("weather-attention-candidate", act("weather:curated", {
          kind: "weather_attention_candidate",
          category: "weather_attention",
        }), { priority: "high" }),
      ],
    });

    expect(run.selected?.ruleId).toBe("weather-attention-candidate");
    expect(run.evaluations).toMatchObject([
      { outcome: "act", disposition: "not_selected" },
      { outcome: "act", disposition: "selected" },
    ]);
  });

  it.each([
    ["fuera de ventana", { ...WINDOW, validFrom: "2026-10-03T16:00:00.000Z", validUntil: "2026-10-03T17:00:00.000Z", effectiveAt: "2026-10-03T16:00:00.000Z", expiresAt: "2026-10-03T17:00:00.000Z" }, "outside_effective_window"],
    ["vencida", { ...WINDOW, validFrom: "2026-10-03T13:00:00.000Z", validUntil: "2026-10-03T14:00:00.000Z", effectiveAt: "2026-10-03T13:30:00.000Z", expiresAt: "2026-10-03T14:00:00.000Z" }, "outside_effective_window"],
    ["inválida", { ...WINDOW, validFrom: "bad-date" }, "invalid_context"],
  ] as const)("abstiene una acción %s", (_label, window, reasonCode) => {
    const run = createContextDecisionRun(input(), {
      now: () => new Date(NOW),
      rules: [rule("trip-start-today", act("trip:window", { window }))],
    });

    expect(run.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode });
    expect(run.selected).toBeNull();
  });

  it("descarta señales conflictivas explícitas", () => {
    const run = createContextDecisionRun(input(), {
      now: () => new Date(NOW),
      rules: [rule("weather-attention-candidate", abstain("conflicting_signals"))],
    });

    expect(run.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "conflicting_signals", confidence: "insufficient" });
  });

  it("emite observaciones categóricas deterministas y omite datos sensibles", () => {
    const observer = vi.fn();
    const run = createContextDecisionRun(input(), {
      now: () => new Date(NOW),
      timingNow: () => 42,
      observer,
      rules: [rule("trip-start-today", act("trip-private:kari@example.com:token=secret"))],
    });

    expect(run.selected?.outcome).toBe("act");
    expect(observer).toHaveBeenCalledWith({
      ruleId: "trip-start-today",
      phase: "selected",
      outcome: "act",
      reasonCode: "actionable",
      availability: "available",
      freshness: "fresh",
      durationMs: 0,
    });
    expect(JSON.stringify(observer.mock.calls)).not.toMatch(/trip-private|kari|token|secret|dedupe|payload/i);
  });

  it("explica acciones y abstenciones con capabilities y modulos declarados", () => {
    const weatherRule = rule("weather-attention-candidate", act("weather:curated", {
      kind: "weather_attention_candidate",
      category: "weather_attention",
    }), {
      requiredCapabilities: ["weather"],
      requiredModules: ["weather"],
      freshnessPolicy: "fresh_weather",
    });
    const missingRule = rule("light-moment-candidate", abstain("missing_activity_metadata"), {
      requiredCapabilities: ["weather", "narrative"],
      requiredModules: ["weather", "narrative"],
      freshnessPolicy: "fresh_weather",
    });

    const run = createContextDecisionRun(input(), {
      now: () => new Date(NOW),
      rules: [weatherRule, missingRule],
    });

    expect(run.evaluations).toMatchObject([
      {
        outcome: "act",
        requiredCapabilities: ["weather"],
        sourceModules: ["weather"],
        evidence: [{ kind: "signal", state: "present" }],
        freshness: [{ module: "temporal", state: "fresh" }],
        window: WINDOW,
        reasonCode: "actionable",
        confidence: "sufficient",
      },
      {
        outcome: "abstain",
        requiredCapabilities: ["weather", "narrative"],
        sourceModules: ["weather", "narrative"],
        reasonCode: "missing_activity_metadata",
        confidence: "insufficient",
      },
    ]);
    expect(JSON.stringify(run.evaluations)).not.toMatch(/score|suggestedChannels|editorialCopy/i);
  });

  it.each([
    [Number.POSITIVE_INFINITY, 0],
    [-50, 0],
    [70_001, 60_000],
  ])("sanitiza la duracion del observer (%s)", (finishedAt, expectedDuration) => {
    const observer = vi.fn();
    const timingNow = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(finishedAt);

    createContextDecisionRun(input(), {
      now: () => new Date(NOW),
      timingNow,
      observer,
      rules: [rule("trip-start-today", abstain("invalid_context"))],
    });

    expect(observer).toHaveBeenCalledWith(expect.objectContaining({
      ruleId: "trip-start-today",
      phase: "abstained",
      outcome: "abstain",
      reasonCode: "invalid_context",
      availability: "partial",
      freshness: "unavailable",
      durationMs: expectedDuration,
    }));
  });

  it("mantiene el silencio como resultado aunque el observer falle", () => {
    const observer = vi.fn(() => { throw new Error("private raw failure kari@example.com"); });

    const run = createContextDecisionRun(input(), {
      now: () => new Date(NOW),
      observer,
      rules: [rule("trip-start-today", abstain("incomplete_context"))],
    });

    expect(run.selected).toBeNull();
    expect(run.decision).toMatchObject({
      outcome: "abstain",
      ruleId: "engine",
      reasonCode: "incomplete_context",
      confidence: "insufficient",
    });
    expect(observer).toHaveBeenCalledTimes(1);
  });

  it("conserva la frontera pura sin Companion, Push, Experience, IA, geofence, endpoints ni providers", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const productionFiles = ["contracts.ts", "constants.ts", "time.ts", "rules.ts", "engine.ts", "observer.ts", "index.ts"];
    const imports = productionFiles
      .flatMap((file) => readFileSync(join(directory, file), "utf8").match(/^import .*$/gm) ?? [])
      .join("\n");

    expect(imports).not.toMatch(/companion|push|experience|editorial|memory|open-?meteo|geofenc|\/api\//i);
    expect(imports).not.toMatch(/react|fetch|mongodb|vercel|ai\/|openai/i);
  });
});
