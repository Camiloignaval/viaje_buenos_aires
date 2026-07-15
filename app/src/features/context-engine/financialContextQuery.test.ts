import { describe, expect, it, vi } from "vitest";
import { financialContextQueryKey, financialContextQueryOptions } from "./financialContextQuery";

const { resolveFinancialRate } = vi.hoisted(() => ({ resolveFinancialRate: vi.fn() }));
vi.mock("./financialContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./financialContext")>()),
  resolveFinancialRate,
}));

describe("financialContextQuery", () => {
  it("identifica el recurso remoto solo por el par de monedas", () => {
    expect(financialContextQueryKey({ amount: 1000, currency: "ARS" }, "CLP")).toEqual([
      "context-engine", "financial-rate", "ARS", "CLP",
    ]);
    expect(financialContextQueryKey({ amount: 2000, currency: "ARS" }, "CLP")).toEqual([
      "context-engine", "financial-rate", "ARS", "CLP",
    ]);
  });

  it("cachea la tasa remota y calcula cada monto local mediante select", async () => {
    resolveFinancialRate.mockResolvedValueOnce({
      available: true, rate: 0.75, rateDate: "2026-07-15", freshness: "fresh",
      source: "frankfurter", fetchedAt: "2026-07-15T12:00:00Z",
    });
    const options1000 = financialContextQueryOptions({ amount: 1000, currency: "ARS" }, "CLP");
    const options2000 = financialContextQueryOptions({ amount: 2000, currency: "ARS" }, "CLP");
    expect(options1000).toMatchObject({ enabled: true, staleTime: 3_600_000, retry: false });
    const rate = await options1000.queryFn!({ signal: new AbortController().signal } as never);
    expect(options1000.select!(rate)).toMatchObject({ convertedMoney: { amount: 750, currency: "CLP" } });
    expect(options2000.select!(rate)).toMatchObject({ convertedMoney: { amount: 1500, currency: "CLP" } });
    expect(resolveFinancialRate).toHaveBeenCalledTimes(1);
    expect(resolveFinancialRate).toHaveBeenCalledWith(expect.objectContaining({ baseCurrency: "ARS", preferredCurrency: "CLP" }));
  });
});
