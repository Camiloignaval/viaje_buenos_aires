import { describe, it, expect } from "vitest";
import { formatHumanDate, formatHumanTime, formatHumanDateTime, formatHumanDateRange } from "./dateFormat";

describe("formatHumanDate / formatHumanTime", () => {
  it("formatea la fecha en es-CL, nunca ISO crudo", () => {
    expect(formatHumanDate("2026-07-18T09:30")).toBe("18 de julio de 2026");
  });

  it("formatea la hora en 24 horas, con ceros a la izquierda", () => {
    expect(formatHumanTime("2026-07-18T09:30")).toBe("09:30");
    expect(formatHumanTime("2026-07-21T22:00")).toBe("22:00");
  });

  it("nunca muestra el string ISO ni sufijo UTC/Z", () => {
    const text = formatHumanDateTime("2026-07-18T09:30");
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(text).not.toMatch(/Z$/);
    expect(text).toBe("18 de julio de 2026 · 09:30");
  });

  it("no reinterpreta la hora a través de ningún timezone (los números se muestran tal cual se guardaron)", () => {
    // Si en algún momento se usara `new Date(string)` + timeZone real, esta
    // hora cercana a medianoche sería el primer síntoma: el día/hora mostrado
    // cambiaría según el huso del dispositivo que corre el test.
    expect(formatHumanTime("2026-01-05T23:55")).toBe("23:55");
    expect(formatHumanDate("2026-01-05T23:55")).toBe("5 de enero de 2026");
  });
});

describe("formatHumanDateRange", () => {
  it("mismo mes y año: rango compacto", () => {
    expect(formatHumanDateRange("2026-07-18T09:30", "2026-07-21T22:00")).toBe("18–21 de julio de 2026");
  });

  it("mismo año, distinto mes", () => {
    expect(formatHumanDateRange("2026-07-30T09:00", "2026-08-02T12:00")).toBe(
      "30 de julio – 2 de agosto de 2026",
    );
  });

  it("distinto año", () => {
    expect(formatHumanDateRange("2026-12-28T09:00", "2027-01-03T12:00")).toBe(
      "28 de diciembre de 2026 – 3 de enero de 2027",
    );
  });
});
