import { describe, it, expect } from "vitest";
import { resolveTravelContext } from "@/features/context-engine/travelContext";
import {
  resolveTravelPreparations,
  travelContextFromStory,
} from "./travelPreparations";
import type { StoryPackage } from "@/features/story/engine/types";

describe("resolveTravelPreparations", () => {
  it("deriva idioma y moneda del contexto de Argentina", () => {
    const context = resolveTravelContext({ countryCode: "AR", countryName: "Argentina" });
    const notes = resolveTravelPreparations(context);
    const byCategory = Object.fromEntries(notes.map((n) => [n.category, n.text]));
    expect(byCategory.language).toContain("español");
    expect(byCategory.money).toContain("peso argentino");
    expect(byCategory.money).toContain("ARS");
  });

  it("no inventa notas cuando no hay contexto", () => {
    expect(resolveTravelPreparations(resolveTravelContext())).toEqual([]);
  });

  it("agrega documentación solo si el viaje cruza una frontera", () => {
    const context = resolveTravelContext({ countryCode: "AR" });
    const domestic = resolveTravelPreparations(context, { residenceCountryCode: "AR" });
    const international = resolveTravelPreparations(context, { residenceCountryCode: "CL" });
    expect(domestic.some((n) => n.category === "documentation")).toBe(false);
    expect(international.some((n) => n.category === "documentation")).toBe(true);
  });

  it("no usa lenguaje de tareas ni contadores", () => {
    const notes = resolveTravelPreparations(resolveTravelContext({ countryCode: "AR" }));
    for (const note of notes) {
      expect(note.text).not.toMatch(/\d+\s*(tareas?|pendientes?|completas?)/i);
    }
  });
});

describe("travelContextFromStory", () => {
  it("resuelve el contexto desde la metadata declarada de la historia", () => {
    const story = {
      metadata: { destination: "Buenos Aires", destinationCountryCode: "AR", title: "x", travelDates: { start: "2026-07-18", end: "2026-07-21" }, language: "es" },
      budget: { currency: "ARS" },
    } as unknown as StoryPackage;

    const context = travelContextFromStory(story);
    expect(context.country.code).toBe("AR");
    expect(context.currency).toBe("ARS");
    expect(context.city).toBe("Buenos Aires");
    expect(context.language).toBe("es");
  });

  it("degrada a contexto vacío si la historia no declara destino estructurado", () => {
    const story = {
      metadata: { destination: "Algún lugar", title: "x", travelDates: { start: "2026-07-18", end: "2026-07-21" }, language: "es" },
    } as unknown as StoryPackage;
    const context = travelContextFromStory(story);
    expect(context.country.code).toBeNull();
    expect(context.currency).toBeNull();
  });
});
