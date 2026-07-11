import { describe, expect, it } from "vitest";
import { OPENING_MIN_INTERVAL_MS, OPENING_STORAGE_KEY } from "./openingConstants";
import {
  createOpeningRecord,
  getLocalDayKey,
  isDevOpeningForceEnabled,
  parseOpeningRecord,
  shouldShowOpening,
} from "./openingRules";

describe("openingRules", () => {
  it("muestra la apertura cuando no hay registro previo", () => {
    expect(shouldShowOpening({ record: null, now: new Date("2026-07-10T10:00:00") })).toBe(true);
  });

  it("no la muestra de inmediato en el mismo día", () => {
    const now = new Date("2026-07-10T10:00:00");
    const record = createOpeningRecord(now);

    expect(shouldShowOpening({ record, now: new Date("2026-07-10T10:20:00") })).toBe(false);
  });

  it("la muestra cuando pasaron al menos 6 horas", () => {
    const now = new Date("2026-07-10T10:00:00");
    const record = createOpeningRecord(now);

    expect(
      shouldShowOpening({
        record,
        now: new Date(now.getTime() + OPENING_MIN_INTERVAL_MS),
      }),
    ).toBe(true);
  });

  it("la muestra al cambiar el día local aunque no hayan pasado 6 horas", () => {
    const record = createOpeningRecord(new Date("2026-07-10T23:30:00"));

    expect(shouldShowOpening({ record, now: new Date("2026-07-11T00:15:00") })).toBe(true);
  });

  it("trata registros corruptos como ausencia de registro", () => {
    expect(parseOpeningRecord("{mal-json")).toBeNull();
    expect(shouldShowOpening({ record: parseOpeningRecord("{mal-json") })).toBe(true);
  });

  it("habilita force solo en desarrollo", () => {
    expect(isDevOpeningForceEnabled({ search: "?alaiaOpening=1", isDev: true })).toBe(true);
    expect(isDevOpeningForceEnabled({ search: "?forceAlaiaOpening=1", isDev: true })).toBe(true);
    expect(isDevOpeningForceEnabled({ search: "?alaiaOpening=1", isDev: false })).toBe(false);
  });

  it("usa una key global separada del intro de Experience", () => {
    expect(OPENING_STORAGE_KEY).toBe("alaia:opening:lastShown:v1");
    expect(OPENING_STORAGE_KEY).not.toContain("aurora:intro-video-2-seen");
  });

  it("calcula la clave de día local estable", () => {
    expect(getLocalDayKey(new Date(2026, 6, 10, 23, 59))).toBe("2026-07-10");
  });
});
