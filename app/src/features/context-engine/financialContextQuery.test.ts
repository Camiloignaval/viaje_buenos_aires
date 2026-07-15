import { describe, expect, it, vi } from "vitest";
import { financialContextQueryKey, financialContextQueryOptions } from "./financialContextQuery";

const { resolveFinancialContext } = vi.hoisted(() => ({ resolveFinancialContext: vi.fn() }));
vi.mock("./financialContext", () => ({ resolveFinancialContext }));

describe("financialContextQuery", () => {
  it("congela la key compartida incluyendo identidad monetaria efectiva", () => {
    expect(financialContextQueryKey({ amount: 1000, currency: "ARS" }, "CLP")).toEqual([
      "context-engine", "financial", "ARS", 1000, "CLP",
    ]);
    expect(financialContextQueryKey(null, "USD")).toEqual(["context-engine", "financial", undefined, undefined, "USD"]);
  });

  it("las options reutilizan el adapter y mantienen cache/retry existentes", async () => {
    resolveFinancialContext.mockResolvedValueOnce({ available: true });
    const options = financialContextQueryOptions({ amount: 1000, currency: "ARS" }, "CLP");
    expect(options).toMatchObject({ enabled: true, staleTime: 3_600_000, retry: false });
    await options.queryFn!({ signal: new AbortController().signal } as never);
    expect(resolveFinancialContext).toHaveBeenCalledWith(expect.objectContaining({ localMoney: { amount: 1000, currency: "ARS" }, preferredCurrency: "CLP" }));
  });
});
