import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchExchangeRates } from "./exchangeRateClient";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("fetchExchangeRates", () => {
  it("devuelve el snapshot cuando el endpoint interno responde ok", async () => {
    const snapshot = {
      base: "ARS",
      date: "2026-07-14",
      rates: { CLP: 0.75 },
      source: "frankfurter",
      fetchedAt: "2026-07-14T12:00:00.000Z",
      stale: false,
    };
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(snapshot), { status: 200 }));

    const result = await fetchExchangeRates({ base: "ARS", symbols: ["CLP"] });
    expect(result).toEqual(snapshot);
  });

  it("devuelve null (no lanza) si el endpoint interno falla", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: "boom" }), { status: 502 }));

    const result = await fetchExchangeRates({ base: "ARS", symbols: ["CLP"] });
    expect(result).toBeNull();
  });

  it("devuelve null (no lanza) ante un error de red", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    });

    const result = await fetchExchangeRates({ base: "ARS", symbols: ["CLP"] });
    expect(result).toBeNull();
  });

  it("no llama a fetch si no hay símbolos que pedir", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const result = await fetchExchangeRates({ base: "ARS", symbols: [] });
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
