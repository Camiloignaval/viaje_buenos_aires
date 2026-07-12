import { describe, it, expect } from "vitest";
import {
  daysBetweenCalendarDates,
  describeDuration,
  firstDayHint,
  lastDayHint,
} from "./duration";

describe("describeDuration", () => {
  it("un viaje que empieza y termina el mismo día es '1 día'", () => {
    expect(describeDuration("2026-07-18T09:00", "2026-07-18T21:00")).toBe("1 día");
  });

  it("3 noches se describe como '4 días · 3 noches'", () => {
    expect(describeDuration("2026-07-18T09:30", "2026-07-21T22:00")).toBe("4 días · 3 noches");
  });

  it("1 noche usa singular: '2 días · 1 noche'", () => {
    expect(describeDuration("2026-07-18T09:30", "2026-07-19T10:00")).toBe("2 días · 1 noche");
  });

  it("no cambia de día por conversión UTC (horas cercanas a medianoche)", () => {
    // 23:50 de un día a 00:10 del día siguiente: 1 noche real, no un cálculo
    // distinto por interpretar las fechas en UTC.
    expect(describeDuration("2026-07-18T23:50", "2026-07-19T00:10")).toBe("2 días · 1 noche");
  });

  it("calcula 8 días de calendario sin depender de la hora", () => {
    expect(daysBetweenCalendarDates("2026-07-10T23:59", "2026-07-18T00:00")).toBe(8);
    expect(daysBetweenCalendarDates("2026-07-10T00:01", "2026-07-18T23:59")).toBe(8);
  });

  it("calcula 30 días de calendario", () => {
    expect(daysBetweenCalendarDates("2026-07-10T12:00", "2026-08-09T12:00")).toBe(30);
  });

  it("el mismo día son 0 noches y 1 día", () => {
    expect(daysBetweenCalendarDates("2026-07-18T00:01", "2026-07-18T23:59")).toBe(0);
    expect(describeDuration("2026-07-18T00:01", "2026-07-18T23:59")).toBe("1 día");
  });

  it("no se rompe con cambios DST porque no mide horas reales", () => {
    expect(daysBetweenCalendarDates("2026-03-07T23:00", "2026-03-10T01:00")).toBe(3);
    expect(daysBetweenCalendarDates("2026-10-31T23:00", "2026-11-03T01:00")).toBe(3);
  });
});

describe("firstDayHint / lastDayHint", () => {
  it("avisa cuando la llegada es de noche", () => {
    expect(firstDayHint("2026-07-18T22:00")).toMatch(/de noche/);
    expect(firstDayHint("2026-07-18T10:00")).toBeNull();
  });

  it("avisa cuando el regreso es muy temprano", () => {
    expect(lastDayHint("2026-07-21T06:00")).toMatch(/temprano/);
    expect(lastDayHint("2026-07-21T18:00")).toBeNull();
  });
});
