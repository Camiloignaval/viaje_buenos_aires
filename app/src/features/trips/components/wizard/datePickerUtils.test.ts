import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  addCalendarMonths,
  buildCalendarMonth,
  formatCalendarDate,
  initialCalendarDate,
  parseCalendarDate,
} from "./datePickerUtils";

describe("datePickerUtils", () => {
  it("valida fechas reales sin reinterpretarlas en el timezone del dispositivo", () => {
    expect(parseCalendarDate("2026-02-29")).toBeNull();
    expect(parseCalendarDate("2028-02-29")).not.toBeNull();
    expect(formatCalendarDate("2026-07-18")).toBe("Sábado, 18 de julio de 2026");
  });

  it("navega días y meses preservando días válidos", () => {
    expect(addCalendarDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addCalendarMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("crea una grilla lunes-domingo con días externos e inválidos atenuables", () => {
    const days = buildCalendarMonth("2026-07-18", "2026-07-18", "2026-07-13");
    expect(days).toHaveLength(42);
    expect(days[0].value).toBe("2026-06-29");
    expect(days.find((day) => day.value === "2026-07-17")?.disabled).toBe(true);
    expect(days.find((day) => day.value === "2026-07-18")?.disabled).toBe(false);
  });

  it("elige un inicio válido respetando el mínimo", () => {
    expect(initialCalendarDate("", "2030-07-18", "2026-07-13")).toBe("2030-07-18");
    expect(initialCalendarDate("2026-07-10", "2026-07-18", "2026-07-13")).toBe("2026-07-18");
  });
});
