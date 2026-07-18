import { describe, expect, it } from "vitest";
import type { Activity, PhotoSpot } from "@/features/story/engine/types";
import { assignPhotoSpots, resolveActivityComposition, resolveDayPassageLayouts } from "./dayLived";

function activity(id: string, overrides: Partial<Activity> = {}): Activity {
  return { id, title: id, ...overrides };
}

describe("El Día Vivido — asignación conservadora de composiciones", () => {
  it("mapea roles narrativos a las cuatro composiciones aprobadas", () => {
    expect(resolveActivityComposition(activity("llegada", { category: "logística" }), 0)).toBe("umbral-cierre");
    expect(resolveActivityComposition(activity("trayecto", { category: "caminata" }), 1)).toBe("caminado");
    expect(resolveActivityComposition(activity("pausa", {
      intelligence: { relaxLevel: "high", energyLevel: "low" },
    }), 2)).toBe("pausa");
    expect(resolveActivityComposition(activity("almuerzo", { category: "gastronomía", relatedPlaceId: "p-1" }), 3)).toBe("pleno");
  });

  it("no produce dos Pausa consecutivas", () => {
    const pause = { intelligence: { relaxLevel: "high" as const, energyLevel: "low" as const }, description: "Un momento íntimo." };
    const layouts = resolveDayPassageLayouts([activity("p1", pause), activity("p2", pause)]);
    expect(layouts.map(({ composition }) => composition)).toEqual(["pausa", "pleno"]);
  });

  it("muestra la lámina de toda actividad con imagen y centra un solo Pleno", () => {
    const layouts = resolveDayPassageLayouts([
      activity("a", { image: "a.jpg", intelligence: { photoMoment: true } }),
      activity("b", { image: "b.jpg", intelligence: { photoMoment: true } }),
      activity("c", { image: "c.jpg" }),
      activity("d", {}),
    ]);
    // La fotografía editorial ya no se raciona: si hay imagen, se ve.
    expect(layouts.filter(({ showReferencePhoto }) => showReferencePhoto)).toHaveLength(3);
    expect(layouts.filter(({ centered }) => centered)).toHaveLength(1);
    expect(layouts[3].showReferencePhoto).toBe(false);
  });
});

describe("assignPhotoSpots — cada spot cerca de su momento", () => {
  const spot = (id: string, overrides: Partial<PhotoSpot> = {}): PhotoSpot => ({ id, title: id, ...overrides });

  it("asocia el spot a la actividad que coincide por título/lugar, una sola vez", () => {
    const activities = [
      activity("act-cuartito", { title: "Almuerzo en El Cuartito" }),
      activity("act-obelisco", { title: "Caminata al Obelisco", location: { name: "Obelisco de Buenos Aires" } }),
    ];
    const spots = [
      spot("spot-obelisco", { title: "Obelisco", location: { name: "Corrientes y 9 de Julio" } }),
    ];
    const assigned = assignPhotoSpots(activities, spots);
    expect(assigned.get("act-obelisco")?.id).toBe("spot-obelisco");
    expect(assigned.has("act-cuartito")).toBe(false);
  });

  it("no asigna cuando ningún token coincide", () => {
    const assigned = assignPhotoSpots([activity("act-x", { title: "Cena tranquila" })], [spot("s", { title: "Puerto Madero" })]);
    expect(assigned.size).toBe(0);
  });
});
