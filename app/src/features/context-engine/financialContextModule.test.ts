import { describe, it, expect, vi } from "vitest";
import { FinancialContextModule } from "./financialContextModule";

const { fetchExchangeRates } = vi.hoisted(() => ({ fetchExchangeRates: vi.fn() }));
vi.mock("./exchangeRateClient", () => ({ fetchExchangeRates }));

describe("FinancialContextModule", () => {
  it("devuelve invalid_money si no hay Money local", async () => {
    const result = await FinancialContextModule.resolve({ localMoney: null, preferredCurrency: "CLP" });
    expect(result).toMatchObject({ available: false, reason: "invalid_money" });
  });

  it("marca same_currency sin llamar a la red si local y preferida coinciden", async () => {
    const result = await FinancialContextModule.resolve({
      localMoney: { amount: 100, currency: "CLP" },
      preferredCurrency: "CLP",
    });
    expect(result).toMatchObject({ available: false, reason: "same_currency", convertedMoney: null });
    expect(fetchExchangeRates).not.toHaveBeenCalled();
  });

  it("convierte y marca fresh cuando el snapshot no es stale", async () => {
    fetchExchangeRates.mockResolvedValueOnce({
      base: "ARS",
      date: "2026-07-14",
      rates: { CLP: 0.75 },
      source: "frankfurter",
      fetchedAt: "2026-07-14T12:00:00.000Z",
      stale: false,
    });

    const result = await FinancialContextModule.resolve({
      localMoney: { amount: 48000, currency: "ARS" },
      preferredCurrency: "CLP",
    });

    expect(result.available).toBe(true);
    expect(result.freshness).toBe("fresh");
    expect(result.convertedMoney).toEqual({ amount: 36000, currency: "CLP" });
    expect(result.rateDate).toBe("2026-07-14");
  });

  it("marca stale cuando el snapshot viene marcado como tal", async () => {
    fetchExchangeRates.mockResolvedValueOnce({
      base: "ARS",
      date: "2026-07-10",
      rates: { CLP: 0.7 },
      source: "frankfurter",
      fetchedAt: "2026-07-10T12:00:00.000Z",
      stale: true,
    });

    const result = await FinancialContextModule.resolve({
      localMoney: { amount: 1000, currency: "ARS" },
      preferredCurrency: "CLP",
    });

    expect(result.freshness).toBe("stale");
    expect(result.available).toBe(true);
  });

  it("marca fetch_failed si el cliente de tasas devuelve null", async () => {
    fetchExchangeRates.mockResolvedValueOnce(null);

    const result = await FinancialContextModule.resolve({
      localMoney: { amount: 1000, currency: "ARS" },
      preferredCurrency: "CLP",
    });

    expect(result).toMatchObject({ available: false, reason: "fetch_failed" });
  });

  it("marca rate_unavailable si la moneda preferida no viene en las tasas", async () => {
    fetchExchangeRates.mockResolvedValueOnce({
      base: "ARS",
      date: "2026-07-14",
      rates: {},
      source: "frankfurter",
      fetchedAt: "2026-07-14T12:00:00.000Z",
      stale: false,
    });

    const result = await FinancialContextModule.resolve({
      localMoney: { amount: 1000, currency: "ARS" },
      preferredCurrency: "CLP",
    });

    expect(result).toMatchObject({ available: false, reason: "rate_unavailable" });
  });
});
