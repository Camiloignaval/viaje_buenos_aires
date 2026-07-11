import { describe, it, expect } from "vitest";
import {
  INITIAL_WIZARD_DATA,
  WIZARD_STEPS,
  canAdvanceFrom,
  nextStepIndex,
  previousStepIndex,
  buildCreateTripInput,
  type WizardData,
} from "./wizardData";

const AR: WizardData["country"] = { code: "AR", name: "Argentina" };
const BA_CITY: WizardData["city"] = {
  id: "nomi-111",
  name: "Buenos Aires",
  adminName: "CABA",
  countryCode: "AR",
  countryName: "Argentina",
  latitude: -34.6037,
  longitude: -58.3816,
  timezone: "America/Argentina/Buenos_Aires",
};

const FILLED_PROFILE: Partial<WizardData> = {
  travelCompanions: "partner",
  expectedTravelers: 2,
  travelReason: "honeymoon",
  travelStyle: ["romantic"],
  travelBudgetStyle: "balanced",
};

describe("canAdvanceFrom", () => {
  it("title exige texto no vacío", () => {
    expect(canAdvanceFrom("title", INITIAL_WIZARD_DATA)).toBe(false);
    expect(canAdvanceFrom("title", { ...INITIAL_WIZARD_DATA, title: "Buenos Aires" })).toBe(true);
  });

  it("country y city exigen selección", () => {
    expect(canAdvanceFrom("country", INITIAL_WIZARD_DATA)).toBe(false);
    expect(canAdvanceFrom("country", { ...INITIAL_WIZARD_DATA, country: AR })).toBe(true);
    expect(canAdvanceFrom("city", { ...INITIAL_WIZARD_DATA, country: AR })).toBe(false);
    expect(canAdvanceFrom("city", { ...INITIAL_WIZARD_DATA, country: AR, city: BA_CITY })).toBe(true);
  });

  it("departure exige que sea posterior a arrival", () => {
    const base = { ...INITIAL_WIZARD_DATA, startDateTime: "2026-07-18T09:00" };
    expect(canAdvanceFrom("departure", { ...base, endDateTime: "2026-07-18T08:00" })).toBe(false);
    expect(canAdvanceFrom("departure", { ...base, endDateTime: "2026-07-18T21:00" })).toBe(true);
  });

  it("accommodation y context son siempre opcionales", () => {
    expect(canAdvanceFrom("accommodation", INITIAL_WIZARD_DATA)).toBe(true);
    expect(canAdvanceFrom("context", INITIAL_WIZARD_DATA)).toBe(true);
  });

  it("companions, travelers, reason, style y budgetStyle son obligatorios (sin omitir)", () => {
    expect(canAdvanceFrom("companions", INITIAL_WIZARD_DATA)).toBe(false);
    expect(canAdvanceFrom("companions", { ...INITIAL_WIZARD_DATA, travelCompanions: "solo" })).toBe(true);

    expect(canAdvanceFrom("travelers", INITIAL_WIZARD_DATA)).toBe(false);
    expect(canAdvanceFrom("travelers", { ...INITIAL_WIZARD_DATA, expectedTravelers: 2 })).toBe(true);

    expect(canAdvanceFrom("reason", INITIAL_WIZARD_DATA)).toBe(false);
    expect(canAdvanceFrom("reason", { ...INITIAL_WIZARD_DATA, travelReason: "vacation" })).toBe(true);

    expect(canAdvanceFrom("style", INITIAL_WIZARD_DATA)).toBe(false);
    expect(canAdvanceFrom("style", { ...INITIAL_WIZARD_DATA, travelStyle: ["romantic"] })).toBe(true);

    expect(canAdvanceFrom("budgetStyle", INITIAL_WIZARD_DATA)).toBe(false);
    expect(canAdvanceFrom("budgetStyle", { ...INITIAL_WIZARD_DATA, travelBudgetStyle: "simple" })).toBe(true);
  });

  it("budgetAmount solo exige monto+moneda cuando el estilo es 'defined'", () => {
    expect(canAdvanceFrom("budgetAmount", { ...INITIAL_WIZARD_DATA, travelBudgetStyle: "simple" })).toBe(true);
    expect(canAdvanceFrom("budgetAmount", { ...INITIAL_WIZARD_DATA, travelBudgetStyle: "defined" })).toBe(false);
    expect(
      canAdvanceFrom("budgetAmount", {
        ...INITIAL_WIZARD_DATA,
        travelBudgetStyle: "defined",
        budgetAmount: 1500,
        budgetCurrency: "USD",
      }),
    ).toBe(true);
  });

  it("summary nunca 'avanza' (crea el viaje en su lugar)", () => {
    expect(canAdvanceFrom("summary", INITIAL_WIZARD_DATA)).toBe(false);
  });
});

describe("nextStepIndex / previousStepIndex (saltan budgetAmount si no aplica)", () => {
  const budgetStyleIndex = WIZARD_STEPS.indexOf("budgetStyle");
  const budgetAmountIndex = WIZARD_STEPS.indexOf("budgetAmount");
  const contextIndex = WIZARD_STEPS.indexOf("context");

  it("avanza a budgetAmount cuando el estilo es 'defined'", () => {
    const data = { ...INITIAL_WIZARD_DATA, travelBudgetStyle: "defined" };
    expect(nextStepIndex(budgetStyleIndex, data)).toBe(budgetAmountIndex);
  });

  it("salta budgetAmount directo a context cuando el estilo NO es 'defined'", () => {
    const data = { ...INITIAL_WIZARD_DATA, travelBudgetStyle: "simple" };
    expect(nextStepIndex(budgetStyleIndex, data)).toBe(contextIndex);
  });

  it("volver desde context salta budgetAmount hacia budgetStyle si no aplica", () => {
    const data = { ...INITIAL_WIZARD_DATA, travelBudgetStyle: "simple" };
    expect(previousStepIndex(contextIndex, data)).toBe(budgetStyleIndex);
  });

  it("volver desde context entra a budgetAmount si el estilo es 'defined'", () => {
    const data = { ...INITIAL_WIZARD_DATA, travelBudgetStyle: "defined" };
    expect(previousStepIndex(contextIndex, data)).toBe(budgetAmountIndex);
  });
});

describe("buildCreateTripInput", () => {
  const filled: WizardData = {
    title: "  Buenos Aires  ",
    country: AR,
    city: BA_CITY,
    startDateTime: "2026-07-18T09:30",
    endDateTime: "2026-07-21T22:00",
    accommodation: { type: "hotel", name: "Hotel Alaia" },
    travelContext: "  Nos gusta caminar.  ",
    budgetAmount: null,
    budgetCurrency: "",
    ...FILLED_PROFILE,
  } as WizardData;

  it("arma el payload completo con el perfil narrativo", () => {
    expect(buildCreateTripInput(filled)).toEqual({
      title: "Buenos Aires",
      destination: {
        countryCode: "AR",
        countryName: "Argentina",
        cityId: "nomi-111",
        cityName: "Buenos Aires",
        adminName: "CABA",
        latitude: -34.6037,
        longitude: -58.3816,
        timezone: "America/Argentina/Buenos_Aires",
      },
      startDateTime: "2026-07-18T09:30",
      endDateTime: "2026-07-21T22:00",
      travelCompanions: "partner",
      expectedTravelers: 2,
      travelReason: "honeymoon",
      travelStyle: ["romantic"],
      travelBudgetStyle: "balanced",
      accommodation: { type: "hotel", name: "Hotel Alaia" },
      travelContext: "Nos gusta caminar.",
    });
  });

  it("incluye travelBudget solo cuando el estilo es 'defined'", () => {
    const withBudget = buildCreateTripInput({
      ...filled,
      travelBudgetStyle: "defined",
      budgetAmount: 1500,
      budgetCurrency: "USD",
    });
    expect(withBudget.travelBudget).toEqual({ amount: 1500, currency: "USD", style: "defined" });

    const withoutBudget = buildCreateTripInput(filled);
    expect("travelBudget" in withoutBudget).toBe(false);
  });

  it("lanza si falta país o ciudad", () => {
    expect(() => buildCreateTripInput({ ...filled, city: null })).toThrow(/destino/);
  });

  it("lanza si falta completar el perfil narrativo", () => {
    expect(() => buildCreateTripInput({ ...filled, travelReason: null })).toThrow(/perfil/);
  });
});
