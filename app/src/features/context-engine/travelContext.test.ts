import { describe, it, expect } from "vitest";
import {
  EMPTY_TRAVEL_CONTEXT,
  resolveTravelContext,
} from "./travelContext";

describe("resolveTravelContext", () => {
  it("resuelve el contexto completo de Buenos Aires desde el destino del viaje", () => {
    const context = resolveTravelContext({
      countryCode: "AR",
      countryName: "Argentina",
      city: "Buenos Aires",
      timezone: "America/Argentina/Buenos_Aires",
    });

    expect(context).toEqual({
      country: { code: "AR", name: "Argentina" },
      city: "Buenos Aires",
      timezone: "America/Argentina/Buenos_Aires",
      currency: "ARS",
      locale: "es-AR",
      language: "es",
      metricSystem: { distance: "metric", temperature: "celsius" },
      hourCycle: "h23",
    });
  });

  it("reutiliza el timezone recibido sin recalcularlo", () => {
    const context = resolveTravelContext({ countryCode: "JP", timezone: "Asia/Tokyo" });
    expect(context.timezone).toBe("Asia/Tokyo");
    expect(context.language).toBe("ja");
    expect(context.locale).toBe("ja-JP");
  });

  it("permite que el Story Package declare el idioma predominante del destino", () => {
    // Historia escrita en español sobre un destino donde se habla portugués.
    const context = resolveTravelContext({ countryCode: "BR", destinationLanguage: "pt" });
    expect(context.language).toBe("pt");
    expect(context.locale).toBe("pt-BR");
  });

  it("acepta una moneda local explícita válida y la normaliza", () => {
    const context = resolveTravelContext({ countryCode: "AR", localCurrency: "usd" });
    expect(context.currency).toBe("USD");
  });

  it("ignora una moneda local inválida y cae a la del país", () => {
    const context = resolveTravelContext({ countryCode: "AR", localCurrency: "XYZ" });
    expect(context.currency).toBe("ARS");
  });

  it("sin país no inventa moneda, idioma ni locale", () => {
    const context = resolveTravelContext({ city: "Ciudad desconocida" });
    expect(context.currency).toBeNull();
    expect(context.language).toBeNull();
    expect(context.locale).toBeNull();
    expect(context.city).toBe("Ciudad desconocida");
    expect(context.metricSystem).toEqual({ distance: "metric", temperature: "celsius" });
  });

  it("ante datos corruptos devuelve nulls y defaults, nunca lanza", () => {
    const context = resolveTravelContext({
      countryCode: "argentina",
      countryName: "   ",
      timezone: "",
    });
    expect(context.country).toEqual({ code: null, name: null });
    expect(context.currency).toBeNull();
    expect(context.timezone).toBeNull();
    expect(context.hourCycle).toBe("h23");
  });

  it("no lanza con entrada vacía y equivale al contexto vacío", () => {
    expect(() => resolveTravelContext()).not.toThrow();
    expect(resolveTravelContext()).toEqual(EMPTY_TRAVEL_CONTEXT);
  });

  it("EMPTY_TRAVEL_CONTEXT es un snapshot válido con todo en null y defaults", () => {
    expect(EMPTY_TRAVEL_CONTEXT).toEqual({
      country: { code: null, name: null },
      city: null,
      timezone: null,
      currency: null,
      locale: null,
      language: null,
      metricSystem: { distance: "metric", temperature: "celsius" },
      hourCycle: "h23",
    });
  });
});
