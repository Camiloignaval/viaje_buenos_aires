import { describe, it, expect } from "vitest";
import { resolvePreferredCurrency, FALLBACK_CURRENCY } from "./preferredCurrencyResolver";

describe("resolvePreferredCurrency", () => {
  it("usa la preferencia explícita cuando es válida", () => {
    expect(
      resolvePreferredCurrency({ explicitPreference: "brl", residenceCountryCode: "CL" }),
    ).toBe("BRL");
  });

  it("no pisa la preferencia explícita con el país aunque difieran", () => {
    expect(
      resolvePreferredCurrency({ explicitPreference: "EUR", residenceCountryCode: "AR" }),
    ).toBe("EUR");
  });

  it("deriva desde el país de residencia si no hay preferencia explícita", () => {
    expect(resolvePreferredCurrency({ residenceCountryCode: "JP" })).toBe("JPY");
  });

  it("ignora una preferencia explícita inválida y deriva por país", () => {
    expect(
      resolvePreferredCurrency({ explicitPreference: "XYZ", residenceCountryCode: "PE" }),
    ).toBe("PEN");
  });

  it("cae al fallback documentado si no hay preferencia ni país resolvible", () => {
    expect(resolvePreferredCurrency({})).toBe(FALLBACK_CURRENCY);
    expect(
      resolvePreferredCurrency({ explicitPreference: null, residenceCountryCode: "ZZ" }),
    ).toBe(FALLBACK_CURRENCY);
  });
});
