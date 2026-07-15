import { describe, it, expect } from "vitest";
import {
  buildLocale,
  DEFAULT_HOUR_CYCLE,
  DEFAULT_METRIC_SYSTEM,
  hourCycleForCountry,
  languageForCountry,
  metricSystemForCountry,
  normalizeCountryCode,
} from "./localeCatalog";

describe("normalizeCountryCode", () => {
  it("normaliza a alpha-2 en mayúsculas sin importar espacios ni caja", () => {
    expect(normalizeCountryCode("ar")).toBe("AR");
    expect(normalizeCountryCode("  cl  ")).toBe("CL");
  });

  it("rechaza códigos inválidos y vacíos", () => {
    expect(normalizeCountryCode("argentina")).toBeNull();
    expect(normalizeCountryCode("A")).toBeNull();
    expect(normalizeCountryCode("")).toBeNull();
    expect(normalizeCountryCode(null)).toBeNull();
    expect(normalizeCountryCode(undefined)).toBeNull();
  });
});

describe("languageForCountry", () => {
  it("resuelve el idioma predominante del destino", () => {
    expect(languageForCountry("AR")).toBe("es");
    expect(languageForCountry("br")).toBe("pt");
    expect(languageForCountry("JP")).toBe("ja");
    expect(languageForCountry("US")).toBe("en");
  });

  it("devuelve null para países fuera del catálogo o inválidos", () => {
    expect(languageForCountry("ZZ")).toBeNull();
    expect(languageForCountry("nope")).toBeNull();
    expect(languageForCountry(null)).toBeNull();
  });
});

describe("metricSystemForCountry", () => {
  it("marca a EE.UU. como imperial + Fahrenheit", () => {
    expect(metricSystemForCountry("US")).toEqual({ distance: "imperial", temperature: "fahrenheit" });
  });

  it("Reino Unido conserva millas pero mide en Celsius", () => {
    expect(metricSystemForCountry("GB")).toEqual({ distance: "imperial", temperature: "celsius" });
  });

  it("el resto del alcance es métrico + Celsius", () => {
    expect(metricSystemForCountry("AR")).toEqual(DEFAULT_METRIC_SYSTEM);
    expect(metricSystemForCountry("JP")).toEqual(DEFAULT_METRIC_SYSTEM);
  });

  it("defaults métrico+Celsius para país desconocido", () => {
    expect(metricSystemForCountry("ZZ")).toEqual(DEFAULT_METRIC_SYSTEM);
    expect(metricSystemForCountry(null)).toEqual(DEFAULT_METRIC_SYSTEM);
  });
});

describe("hourCycleForCountry", () => {
  it("resuelve el ciclo horario del país", () => {
    expect(hourCycleForCountry("US")).toBe("h12");
    expect(hourCycleForCountry("AR")).toBe("h23");
  });

  it("default 24h para país desconocido", () => {
    expect(hourCycleForCountry("ZZ")).toBe(DEFAULT_HOUR_CYCLE);
    expect(hourCycleForCountry(undefined)).toBe(DEFAULT_HOUR_CYCLE);
  });
});

describe("buildLocale", () => {
  it("combina idioma y país en BCP-47", () => {
    expect(buildLocale("es", "AR")).toBe("es-AR");
    expect(buildLocale("PT", "br")).toBe("pt-BR");
  });

  it("devuelve solo el idioma si no hay país válido", () => {
    expect(buildLocale("es", null)).toBe("es");
    expect(buildLocale("es", "nope")).toBe("es");
  });

  it("devuelve null si no hay idioma", () => {
    expect(buildLocale(null, "AR")).toBeNull();
    expect(buildLocale("", "AR")).toBeNull();
  });
});
