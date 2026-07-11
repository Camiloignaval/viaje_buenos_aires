import { describe, it, expect } from "vitest";
import { tripWizardSchema } from "./tripSchemas";

const BA_DESTINATION = {
  countryCode: "AR",
  countryName: "Argentina",
  cityId: "nomi-111",
  cityName: "Buenos Aires",
  latitude: -34.6037,
  longitude: -58.3816,
  timezone: "America/Argentina/Buenos_Aires",
};

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "Buenos Aires",
    destination: BA_DESTINATION,
    startDateTime: "2026-07-18T09:30",
    endDateTime: "2026-07-21T22:00",
    travelCompanions: "partner",
    expectedTravelers: 2,
    travelReason: "honeymoon",
    travelStyle: ["romantic"],
    travelBudgetStyle: "balanced",
    ...overrides,
  };
}

describe("tripWizardSchema", () => {
  it("exige título con el mensaje original", () => {
    const result = tripWizardSchema.safeParse(validPayload({ title: "  " }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const titleIssue = result.error.issues.find((i) => i.path[0] === "title");
      expect(titleIssue?.message).toBe("El viaje necesita un título.");
    }
  });

  it("exige un destino estructurado válido", () => {
    const result = tripWizardSchema.safeParse(
      validPayload({ destination: { ...BA_DESTINATION, cityName: "" } }),
    );
    expect(result.success).toBe(false);
  });

  it("exige que el regreso sea posterior a la llegada", () => {
    const result = tripWizardSchema.safeParse(
      validPayload({ startDateTime: "2026-07-18T22:00", endDateTime: "2026-07-18T09:30" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "endDateTime");
      expect(issue?.message).toBe("La vuelta debe ser después de la llegada.");
    }
  });

  it("permite viajes que empiezan y terminan el mismo día", () => {
    const result = tripWizardSchema.safeParse(
      validPayload({ startDateTime: "2026-07-18T09:00", endDateTime: "2026-07-18T21:00" }),
    );
    expect(result.success).toBe(true);
  });

  it("acepta un payload completo con alojamiento y contexto opcionales", () => {
    const result = tripWizardSchema.safeParse(
      validPayload({
        accommodation: { type: "hotel", name: "Hotel Alaia" },
        travelContext: "Nos gusta caminar.",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rechaza travelContext más largo que el límite", () => {
    const result = tripWizardSchema.safeParse(validPayload({ travelContext: "x".repeat(501) }));
    expect(result.success).toBe(false);
  });

  it("recorta espacios del título", () => {
    const result = tripWizardSchema.safeParse(validPayload({ title: "  Buenos Aires 2026  " }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Buenos Aires 2026");
    }
  });

  it("rechaza travelCompanions, travelReason y travelBudgetStyle inválidos", () => {
    expect(tripWizardSchema.safeParse(validPayload({ travelCompanions: "mascotas" })).success).toBe(false);
    expect(tripWizardSchema.safeParse(validPayload({ travelReason: "fiesta" })).success).toBe(false);
    expect(tripWizardSchema.safeParse(validPayload({ travelBudgetStyle: "infinito" })).success).toBe(false);
  });

  it("exige entre 1 y 2 estilos de viaje", () => {
    expect(tripWizardSchema.safeParse(validPayload({ travelStyle: [] })).success).toBe(false);
    expect(
      tripWizardSchema.safeParse(validPayload({ travelStyle: ["romantic", "cultural", "nature"] })).success,
    ).toBe(false);
    expect(tripWizardSchema.safeParse(validPayload({ travelStyle: ["romantic", "cultural"] })).success).toBe(true);
  });

  it("exige travelBudget cuando travelBudgetStyle es 'defined'", () => {
    const withoutBudget = tripWizardSchema.safeParse(validPayload({ travelBudgetStyle: "defined" }));
    expect(withoutBudget.success).toBe(false);

    const withBudget = tripWizardSchema.safeParse(
      validPayload({
        travelBudgetStyle: "defined",
        travelBudget: { amount: 1500, currency: "USD", style: "defined" },
      }),
    );
    expect(withBudget.success).toBe(true);
  });
});
