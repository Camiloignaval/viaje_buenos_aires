import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveFinancialContext } from "./financialContext";

const { resolve } = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock("./financialContextModule", () => ({ FinancialContextModule: { resolve } }));

describe("resolveFinancialContext", () => {
  beforeEach(() => resolve.mockReset());

  it("conserva source, fetchedAt y stale del snapshot real", async () => {
    resolve.mockResolvedValue({
      localMoney: { amount: 1000, currency: "ARS" }, convertedMoney: { amount: 750, currency: "CLP" },
      rateDate: "2026-07-10", freshness: "stale", available: true,
      source: "frankfurter", fetchedAt: "2026-07-10T12:00:00Z",
    });
    expect(await resolveFinancialContext({ localMoney: { amount: 1000, currency: "ARS" }, preferredCurrency: "CLP" })).toMatchObject({
      source: "frankfurter", fetchedAt: "2026-07-10T12:00:00Z", freshness: "stale",
    });
  });

  it("mantiene una indisponibilidad compatible sin inventar provenance", async () => {
    resolve.mockResolvedValue({ localMoney: { amount: 0, currency: "" }, convertedMoney: null, rateDate: null, freshness: "unavailable", available: false, reason: "invalid_money" });
    expect(await resolveFinancialContext({ localMoney: null, preferredCurrency: "USD" })).toMatchObject({ available: false, reason: "invalid_money", source: null, fetchedAt: null });
  });
});
