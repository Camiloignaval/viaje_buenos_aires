import { describe, expect, it } from "vitest";
import type { DecisionInput } from "./contracts";
import { createContextDecisionRun } from "./engine";
import { DECISION_RULES } from "./rules";

const BUENOS_AIRES = "America/Argentina/Buenos_Aires";

function temporalInput({
  start = "2026-10-04",
  end = "2026-10-08",
  timezone = BUENOS_AIRES,
  freshness = "fresh" as const,
  processedKeys = new Set<string>(),
}: {
  start?: string;
  end?: string;
  timezone?: string;
  freshness?: "fresh" | "stale";
  processedKeys?: ReadonlySet<string>;
} = {}): DecisionInput {
  const availableModule = {
    status: "available" as const,
    value: null,
    reason: null,
    freshness: "fresh" as const,
    provenance: { owner: "trip" as const, source: "fixture", observedAt: null },
  };
  const temporal = {
    status: "available" as const,
    value: {
      startDateTime: start,
      endDateTime: end,
      timezone,
      // Rules must rederive this state for their injected clock instead of trusting it.
      state: { kind: "memory" as const, daysSinceEnd: 99 },
    },
    reason: null,
    freshness,
    provenance: { owner: "trip" as const, source: "trip.dates", observedAt: "2020-01-01T00:00:00.000Z" },
  };
  return {
    tripId: "trip-private",
    context: {
      resolvedAt: "2020-01-01T00:00:00.000Z",
      destination: availableModule,
      temporal,
      financial: { ...availableModule, status: "unavailable", freshness: "unavailable", reason: "missing_financial_input" },
      narrative: availableModule,
      weather: { ...availableModule, status: "unavailable", freshness: "unavailable", reason: "missing_weather_input" },
      capabilities: { destination: true, temporal: true, financial: false, narrative: true, weather: false },
    },
    preferences: { enabled: true, beforeTrip: true, duringTrip: true },
    processedKeys,
    activities: [],
  };
}

function temporalRun(input: DecisionInput, now: string) {
  return createContextDecisionRun(input, {
    now: () => new Date(now),
    rules: DECISION_RULES.slice(0, 3),
  });
}

describe("temporal decision rules", () => {
  it("actúa mañana con identidad estable y una ventana del día local del destino", () => {
    const run = temporalRun(temporalInput(), "2026-10-03T15:00:00.000Z");

    expect(run.selected).toMatchObject({
      ruleId: "trip-start-tomorrow",
      kind: "trip_start_tomorrow",
      dedupeKey: "trip-private:trip_start_tomorrow:2026-10-04",
      payload: { attentionSignal: "trip_lifecycle", temporalState: "before" },
      window: {
        validFrom: "2026-10-03T03:00:00.000Z",
        validUntil: "2026-10-04T03:00:00.000Z",
        expiresAt: "2026-10-04T03:00:00.000Z",
      },
    });
    expect(run.evaluations.map(({ reasonCode }) => reasonCode)).toEqual([
      "actionable",
      "trip_not_applicable",
      "trip_not_applicable",
    ]);
  });

  it("actúa hoy en el destino aunque el reloj UTC todavía esté en el día anterior", () => {
    const run = temporalRun(
      temporalInput({ start: "2026-10-04T09:30", end: "2026-10-08T18:00", timezone: "Asia/Tokyo" }),
      "2026-10-03T16:00:00.000Z",
    );

    expect(run.selected).toMatchObject({
      ruleId: "trip-start-today",
      kind: "trip_start_today",
      dedupeKey: "trip-private:trip_start_today:2026-10-04",
    });
    expect(run.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "trip_not_applicable" });
  });

  it.each([
    ["en curso", "2026-10-03", "2026-10-08", "2026-10-05T15:00:00.000Z"],
    ["ya iniciado y último día", "2026-10-03", "2026-10-05", "2026-10-05T15:00:00.000Z"],
  ] as const)("abstiene las reglas de inicio cuando el viaje está %s", (_label, start, end, now) => {
    const run = temporalRun(temporalInput({ start, end }), now);

    expect(run.evaluations.slice(0, 2)).toMatchObject([
      { outcome: "abstain", reasonCode: "trip_not_applicable" },
      { outcome: "abstain", reasonCode: "trip_not_applicable" },
    ]);
  });

  it("conserva el día destino y sus límites durante el cambio DST", () => {
    const run = temporalRun(
      temporalInput({ start: "2026-03-08", end: "2026-03-12", timezone: "America/New_York", freshness: "stale" }),
      "2026-03-08T16:00:00.000Z",
    );

    expect(run.selected).toMatchObject({
      ruleId: "trip-start-today",
      freshness: [{ module: "temporal", state: "stale" }],
      window: {
        validFrom: "2026-03-08T05:00:00.000Z",
        validUntil: "2026-03-09T04:00:00.000Z",
        expiresAt: "2026-03-09T04:00:00.000Z",
      },
    });
  });

  it("abstiene con already_processed cuando la identidad semántica ya fue procesada", () => {
    const key = "trip-private:trip_start_today:2026-10-04";
    const run = temporalRun(temporalInput({ processedKeys: new Set([key]) }), "2026-10-04T15:00:00.000Z");

    expect(run.evaluations[1]).toMatchObject({
      outcome: "abstain",
      reasonCode: "already_processed",
      dedupeKey: key,
    });
    expect(run.selected).toBeNull();
  });

  it("no selecciona una decisión temporal retenida después del fin de su día local", () => {
    const decisionInput = temporalInput();
    const originalNow = new Date("2026-10-03T15:00:00.000Z");
    const retained = DECISION_RULES[0].evaluate(decisionInput, originalNow);
    const run = createContextDecisionRun(decisionInput, {
      now: () => new Date("2026-10-04T03:00:00.000Z"),
      rules: [{ ...DECISION_RULES[0], evaluate: () => retained }],
    });

    expect(retained[0]).toMatchObject({ outcome: "act", window: { validUntil: "2026-10-04T03:00:00.000Z" } });
    expect(run.evaluations[0]).toMatchObject({ outcome: "abstain", reasonCode: "outside_effective_window" });
    expect(run.selected).toBeNull();
  });

  it("actúa el último día y no actúa el día anterior", () => {
    const lastDay = temporalRun(temporalInput({ start: "2026-10-03", end: "2026-10-05" }), "2026-10-05T15:00:00.000Z");
    const previousDay = temporalRun(temporalInput({ start: "2026-10-03", end: "2026-10-05" }), "2026-10-04T15:00:00.000Z");

    expect(lastDay.selected).toMatchObject({
      ruleId: "last-day",
      kind: "trip_last_day",
      dedupeKey: "trip-private:trip_last_day:2026-10-05",
      payload: { attentionSignal: "trip_lifecycle", temporalState: "active" },
    });
    expect(previousDay.evaluations[2]).toMatchObject({ outcome: "abstain", reasonCode: "trip_not_applicable" });
  });

  it("abstiene un viaje finalizado con una causa cerrada", () => {
    const run = temporalRun(temporalInput({ start: "2026-10-03", end: "2026-10-05" }), "2026-10-06T15:00:00.000Z");

    expect(run.evaluations).toMatchObject([
      { outcome: "abstain", reasonCode: "trip_not_applicable" },
      { outcome: "abstain", reasonCode: "trip_not_applicable" },
      { outcome: "abstain", reasonCode: "trip_finished" },
    ]);
    expect(run.selected).toBeNull();
  });

  it.each([
    ["inicio ausente", "", "2026-10-05", BUENOS_AIRES],
    ["fin ausente", "2026-10-03", "", BUENOS_AIRES],
    ["fecha inválida", "2026-02-30", "2026-10-05", BUENOS_AIRES],
    ["timezone inválida", "2026-10-03", "2026-10-05", "Mars/Olympus"],
  ] as const)("abstiene por contexto inválido con %s", (_label, start, end, timezone) => {
    const run = temporalRun(temporalInput({ start, end, timezone }), "2026-10-03T15:00:00.000Z");

    expect(run.evaluations).toHaveLength(3);
    expect(run.evaluations.every(({ outcome, reasonCode }) => outcome === "abstain" && reasonCode === "invalid_context")).toBe(true);
  });

  it("conserva ambos candidatos en un viaje de un día y elige inicio-hoy por orden estable", () => {
    const run = temporalRun(temporalInput({ start: "2026-10-04", end: "2026-10-04" }), "2026-10-04T15:00:00.000Z");

    expect(run.selected?.ruleId).toBe("trip-start-today");
    expect(run.evaluations).toMatchObject([
      { ruleId: "trip-start-tomorrow", outcome: "abstain" },
      { ruleId: "trip-start-today", outcome: "act", disposition: "selected" },
      { ruleId: "last-day", outcome: "abstain", reasonCode: "not_selected" },
    ]);
  });
});
