import { describe, it, expect } from "vitest";
import { isSupportedCurrency, currencyForCountry, SUPPORTED_CURRENCIES } from "./currencyCatalog";

describe("isSupportedCurrency", () => {
  it("acepta monedas del allowlist sin importar mayúsculas/minúsculas", () => {
    expect(isSupportedCurrency("ARS")).toBe(true);
    expect(isSupportedCurrency("clp")).toBe(true);
  });

  it("rechaza monedas fuera del allowlist y valores vacíos", () => {
    expect(isSupportedCurrency("XYZ")).toBe(false);
    expect(isSupportedCurrency("")).toBe(false);
    expect(isSupportedCurrency(null)).toBe(false);
    expect(isSupportedCurrency(undefined)).toBe(false);
  });
});

describe("currencyForCountry", () => {
  const CASES: Array<[string, string]> = [
    ["AR", "ARS"],
    ["CL", "CLP"],
    ["BR", "BRL"],
    ["US", "USD"],
    ["ES", "EUR"],
    ["JP", "JPY"],
    ["MX", "MXN"],
    ["GB", "GBP"],
    ["UY", "UYU"],
    ["PE", "PEN"],
    ["CO", "COP"],
  ];

  it.each(CASES)("resuelve %s → %s", (country, currency) => {
    expect(currencyForCountry(country)).toBe(currency);
  });

  it("es insensible a mayúsculas/minúsculas y a espacios", () => {
    expect(currencyForCountry(" cl ")).toBe("CLP");
  });

  it("devuelve null para país desconocido o ausente", () => {
    expect(currencyForCountry("ZZ")).toBeNull();
    expect(currencyForCountry(null)).toBeNull();
    expect(currencyForCountry(undefined)).toBeNull();
  });

  it("cada moneda resuelta por país está en el allowlist", () => {
    for (const [, currency] of CASES) {
      expect(SUPPORTED_CURRENCIES).toContain(currency);
    }
  });
});
