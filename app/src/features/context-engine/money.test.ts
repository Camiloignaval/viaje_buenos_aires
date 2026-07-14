import { describe, it, expect } from "vitest";
import { createMoney, normalizeLegacyMoney, parseLegacyAmount, roundMoney, decimalsForCurrency } from "./money";

describe("createMoney", () => {
  it("crea un Money válido con moneda normalizada a mayúsculas", () => {
    expect(createMoney(48000, "ars")).toEqual({ amount: 48000, currency: "ARS" });
  });

  it("rechaza montos no finitos (NaN, Infinity)", () => {
    expect(createMoney(NaN, "ARS")).toBeNull();
    expect(createMoney(Infinity, "ARS")).toBeNull();
  });

  it("rechaza monedas no soportadas", () => {
    expect(createMoney(100, "XYZ")).toBeNull();
    expect(createMoney(100, "")).toBeNull();
  });

  it("acepta cero y negativos (el llamador decide si tienen sentido en su contexto)", () => {
    expect(createMoney(0, "USD")).toEqual({ amount: 0, currency: "USD" });
    expect(createMoney(-10, "USD")).toEqual({ amount: -10, currency: "USD" });
  });

  it("redondea CLP y JPY sin decimales", () => {
    expect(createMoney(100.456, "CLP")).toEqual({ amount: 100, currency: "CLP" });
    expect(createMoney(100.456, "JPY")).toEqual({ amount: 100, currency: "JPY" });
  });

  it("redondea el resto de las monedas a 2 decimales", () => {
    expect(createMoney(100.456, "USD")).toEqual({ amount: 100.46, currency: "USD" });
  });
});

describe("decimalsForCurrency / roundMoney", () => {
  it("CLP/JPY usan 0 decimales, el resto 2", () => {
    expect(decimalsForCurrency("CLP")).toBe(0);
    expect(decimalsForCurrency("JPY")).toBe(0);
    expect(decimalsForCurrency("ARS")).toBe(2);
  });

  it("roundMoney respeta la cantidad de decimales por moneda", () => {
    expect(roundMoney(1234.567, "CLP")).toBe(1235);
    expect(roundMoney(1234.567, "USD")).toBe(1234.57);
  });
});

describe("parseLegacyAmount", () => {
  it("reconoce un monto único con símbolo y separador de miles", () => {
    expect(parseLegacyAmount("$8.000")).toBe(8000);
    expect(parseLegacyAmount("10000")).toBe(10000);
  });

  it("devuelve null ante rangos", () => {
    expect(parseLegacyAmount("$15.000–$25.000")).toBeNull();
  });

  it("devuelve null ante texto libre", () => {
    expect(parseLegacyAmount("Variable")).toBeNull();
  });

  it("devuelve null ante monto cero o negativo tras el parseo", () => {
    expect(parseLegacyAmount("$0")).toBeNull();
  });
});

describe("normalizeLegacyMoney", () => {
  it("normaliza un number legacy con su moneda", () => {
    expect(normalizeLegacyMoney(48000, "ARS")).toEqual({ amount: 48000, currency: "ARS" });
  });

  it("normaliza un string legacy limpio con su moneda", () => {
    expect(normalizeLegacyMoney("$8.000", "CLP")).toEqual({ amount: 8000, currency: "CLP" });
  });

  it("devuelve null si la moneda no viene informada (nunca asume una por defecto)", () => {
    expect(normalizeLegacyMoney("$8.000", undefined)).toBeNull();
    expect(normalizeLegacyMoney("$8.000", "")).toBeNull();
  });

  it("devuelve null ante un string no parseable con seguridad (rango o texto libre)", () => {
    expect(normalizeLegacyMoney("$15.000–$25.000", "ARS")).toBeNull();
    expect(normalizeLegacyMoney("Variable", "ARS")).toBeNull();
  });

  it("devuelve null ante tipos inesperados (no explota)", () => {
    expect(normalizeLegacyMoney(null, "ARS")).toBeNull();
    expect(normalizeLegacyMoney(undefined, "ARS")).toBeNull();
    expect(normalizeLegacyMoney({}, "ARS")).toBeNull();
  });
});
