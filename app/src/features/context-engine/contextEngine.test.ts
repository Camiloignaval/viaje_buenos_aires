import { describe, it, expect } from "vitest";
import { getContextModule, registerContextModule } from "./contextEngine";
import { FinancialContextModule } from "./financialContextModule";

describe("ContextEngine registry", () => {
  it("expone financial ya registrado", () => {
    expect(getContextModule("financial")).toBe(FinancialContextModule);
  });

  it("devuelve undefined para un módulo que todavía no existe (clima, etc.)", () => {
    expect(getContextModule("weather")).toBeUndefined();
  });

  it("permite registrar un módulo nuevo sin afectar a los existentes", () => {
    const fakeModule = { name: "weather-test", resolve: async () => ({ ok: true }) };
    registerContextModule(fakeModule);
    expect(getContextModule("weather-test")).toBe(fakeModule);
    expect(getContextModule("financial")).toBe(FinancialContextModule);
  });
});
