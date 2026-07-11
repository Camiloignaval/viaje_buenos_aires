import type { CountryOption } from "@/components/inputs/CountryCombobox";
import type { CityOption, TripAccommodation } from "../../types";
import type { CreateTripInput } from "../../api/tripsApi";

export interface WizardData {
  title: string;
  country: CountryOption | null;
  city: CityOption | null;
  startDateTime: string;
  endDateTime: string;
  accommodation: TripAccommodation | null;
  travelCompanions: string | null;
  expectedTravelers: number | null;
  travelReason: string | null;
  travelStyle: string[];
  travelBudgetStyle: string | null;
  budgetAmount: number | null;
  budgetCurrency: string;
  travelContext: string;
}

export const INITIAL_WIZARD_DATA: WizardData = {
  title: "",
  country: null,
  city: null,
  startDateTime: "",
  endDateTime: "",
  accommodation: null,
  travelCompanions: null,
  expectedTravelers: null,
  travelReason: null,
  travelStyle: [],
  travelBudgetStyle: null,
  budgetAmount: null,
  budgetCurrency: "",
  travelContext: "",
};

export const WIZARD_STEPS = [
  "title",
  "country",
  "city",
  "arrival",
  "departure",
  "accommodation",
  "companions",
  "travelers",
  "reason",
  "style",
  "budgetStyle",
  "budgetAmount",
  "context",
  "summary",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

// "budgetAmount" solo existe cuando eligieron "definir un presupuesto" en el
// paso anterior — nunca se muestra ni se exige para los otros tres estilos.
function isStepApplicable(step: WizardStep, data: WizardData): boolean {
  if (step === "budgetAmount") return data.travelBudgetStyle === "defined";
  return true;
}

export function nextStepIndex(fromIndex: number, data: WizardData): number {
  let index = Math.min(fromIndex + 1, WIZARD_STEPS.length - 1);
  while (index < WIZARD_STEPS.length - 1 && !isStepApplicable(WIZARD_STEPS[index], data)) {
    index += 1;
  }
  return index;
}

export function previousStepIndex(fromIndex: number, data: WizardData): number {
  let index = Math.max(fromIndex - 1, 0);
  while (index > 0 && !isStepApplicable(WIZARD_STEPS[index], data)) {
    index -= 1;
  }
  return index;
}

// Qué campos exige cada paso para poder avanzar. Alojamiento y contexto son
// opcionales; todo el perfil narrativo (compañía, personas, motivo, estilo,
// forma de vivir el viaje) es obligatorio, sin opción de omitir.
export function canAdvanceFrom(step: WizardStep, data: WizardData): boolean {
  switch (step) {
    case "title":
      return data.title.trim().length > 0;
    case "country":
      return data.country !== null;
    case "city":
      return data.city !== null;
    case "arrival":
      return data.startDateTime.trim().length > 0;
    case "departure":
      return data.endDateTime.trim().length > 0 && data.endDateTime > data.startDateTime;
    case "accommodation":
      return true;
    case "companions":
      return data.travelCompanions !== null;
    case "travelers":
      return data.expectedTravelers != null && data.expectedTravelers >= 1;
    case "reason":
      return data.travelReason !== null;
    case "style":
      return data.travelStyle.length > 0;
    case "budgetStyle":
      return data.travelBudgetStyle !== null;
    case "budgetAmount":
      return (
        data.travelBudgetStyle !== "defined" ||
        (data.budgetAmount != null && data.budgetAmount > 0 && data.budgetCurrency.trim().length > 0)
      );
    case "context":
      return true;
    case "summary":
      return false;
    default:
      return false;
  }
}

export function buildCreateTripInput(data: WizardData): CreateTripInput {
  if (!data.country || !data.city) {
    throw new Error("Faltan datos del destino.");
  }
  if (!data.travelCompanions || !data.expectedTravelers || !data.travelReason || data.travelStyle.length === 0 || !data.travelBudgetStyle) {
    throw new Error("Falta completar el perfil de este viaje.");
  }

  return {
    title: data.title.trim(),
    destination: {
      countryCode: data.city.countryCode,
      countryName: data.city.countryName || data.country.name,
      cityId: data.city.id,
      cityName: data.city.name,
      ...(data.city.adminName ? { adminName: data.city.adminName } : {}),
      latitude: data.city.latitude,
      longitude: data.city.longitude,
      timezone: data.city.timezone,
    },
    startDateTime: data.startDateTime,
    endDateTime: data.endDateTime,
    travelCompanions: data.travelCompanions,
    expectedTravelers: data.expectedTravelers,
    travelReason: data.travelReason,
    travelStyle: data.travelStyle,
    travelBudgetStyle: data.travelBudgetStyle,
    ...(data.accommodation ? { accommodation: data.accommodation } : {}),
    ...(data.travelContext.trim() ? { travelContext: data.travelContext.trim() } : {}),
    ...(data.travelBudgetStyle === "defined" && data.budgetAmount != null && data.budgetCurrency
      ? { travelBudget: { amount: data.budgetAmount, currency: data.budgetCurrency, style: "defined" } }
      : {}),
  };
}
