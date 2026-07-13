import { describe, expect, it } from "vitest";
import { countryCodeToFlagEmoji, countryIdentity, coverDateLine } from "./coverDetails";

describe("countryCodeToFlagEmoji", () => {
  it.each([
    ["AR", "🇦🇷"],
    ["CL", "🇨🇱"],
    ["BR", "🇧🇷"],
    ["ES", "🇪🇸"],
    ["US", "🇺🇸"],
    ["JP", "🇯🇵"],
    ["cl", "🇨🇱"],
  ])("convierte %s en una bandera genérica", (code, flag) => {
    expect(countryCodeToFlagEmoji(code)).toBe(flag);
  });

  it.each([null, undefined, "", "A", "ARG", "A1", "🇦🇷"])(
    "omite el código inválido %s",
    (code) => {
      expect(countryCodeToFlagEmoji(code)).toBeNull();
    },
  );
});

describe("countryIdentity", () => {
  it("combina bandera y nombre accesible sin exponer el ISO", () => {
    expect(countryIdentity("AR", "Argentina")).toEqual({ mark: "🇦🇷", label: "Argentina" });
  });

  it("omite códigos legacy o inválidos y conserva un label accesible defensivo", () => {
    expect(countryIdentity("", "")).toBeNull();
    expect(countryIdentity("CHL", "Chile")).toBeNull();
    expect(countryIdentity("CL", "")).toEqual({ mark: "🇨🇱", label: "País del destino" });
  });
});

describe("coverDateLine", () => {
  it("muestra fechas humanas y noches", () => {
    expect(coverDateLine("2026-07-18T09:30", "2026-07-21T22:00")).toBe(
      "18–21 de julio de 2026 · 3 noches",
    );
  });

  it("no rompe viajes legacy o fechas corruptas", () => {
    expect(coverDateLine()).toBeNull();
    expect(coverDateLine("fecha-mal", "2026-07-21T22:00")).toBeNull();
  });
});
