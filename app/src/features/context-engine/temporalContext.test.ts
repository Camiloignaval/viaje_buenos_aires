import { describe, expect, it } from "vitest";
import { resolveTemporalContext } from "./temporalContext";

describe("resolveTemporalContext", () => {
  it("clasifica por día local del destino a través de un cruce DST", () => {
    const result = resolveTemporalContext({
      startDateTime: "2026-03-08",
      endDateTime: "2026-03-10",
      timezone: "America/New_York",
      observedAt: "2026-03-08T05:00:00Z",
    }, new Date("2026-03-08T06:30:00Z"));
    expect(result.value?.state).toEqual({ kind: "today" });
    expect(result.value?.timezone).toBe("America/New_York");
  });

  it("una timezone inválida degrada solo temporal sin lanzar", () => {
    expect(resolveTemporalContext({ startDateTime: "2026-03-08", endDateTime: "2026-03-10", timezone: "Mars/Olympus" }, new Date())).toMatchObject({
      status: "unavailable",
      reason: "invalid_timezone",
    });
  });
});
