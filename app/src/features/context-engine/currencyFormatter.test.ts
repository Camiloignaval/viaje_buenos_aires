import { describe, it, expect } from "vitest";
import { formatLocalMoney, formatConvertedMoney, FRESHNESS_COPY } from "./currencyFormatter";

describe("formatLocalMoney", () => {
  it("muestra el código ISO explícito, no un símbolo ambiguo", () => {
    expect(formatLocalMoney({ amount: 48000, currency: "ARS" })).toContain("ARS");
    expect(formatLocalMoney({ amount: 8000, currency: "CLP" })).toContain("CLP");
  });

  it("CLP y JPY se formatean sin decimales", () => {
    expect(formatLocalMoney({ amount: 8000, currency: "CLP" })).not.toMatch(/,\d{2}(?!\d)/);
    expect(formatLocalMoney({ amount: 2300, currency: "JPY" })).not.toMatch(/,\d{2}(?!\d)/);
  });
});

describe("formatConvertedMoney", () => {
  it("antepone ≈ y agrega el código ISO al final", () => {
    const formatted = formatConvertedMoney({ amount: 35900, currency: "CLP" });
    expect(formatted.startsWith("≈ ")).toBe(true);
    expect(formatted.endsWith("CLP")).toBe(true);
  });
});

describe("FRESHNESS_COPY", () => {
  it("tiene copy para fresh y stale, y ninguno para unavailable", () => {
    expect(FRESHNESS_COPY.fresh).toBe("Según el cambio de hoy.");
    expect(FRESHNESS_COPY.stale).toBe("Según el último cambio disponible.");
    expect(FRESHNESS_COPY.unavailable).toBeUndefined();
  });
});
