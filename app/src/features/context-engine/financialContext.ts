import { FinancialContextModule, type FinancialContextInput } from "./financialContextModule";
import type { FinancialContext } from "./types";

export async function resolveFinancialContext(input: FinancialContextInput): Promise<FinancialContext> {
  const result = await FinancialContextModule.resolve(input);
  return { source: null, fetchedAt: null, ...result };
}
