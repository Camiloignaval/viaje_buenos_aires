import { describe, expect, it } from "vitest";
import { EDITORIAL_V1_CATALOG, EDITORIAL_V1_PLACEHOLDERS } from "./catalog";
import { validateEditorialCatalog } from "./validation";

const EXPECTED = {
  trip_start_tomorrow: [
    { id: "tomorrow-01", text: "Mañana comienza este viaje." },
    { id: "tomorrow-02", text: "Falta poco: el viaje empieza mañana." },
  ],
  trip_start_today: [
    { id: "today-01", text: "Hoy comienza una nueva historia." },
    { id: "today-02", text: "El viaje empieza hoy, a su propio ritmo." },
  ],
  trip_last_day: [
    { id: "last-day-01", text: "Hoy es el último día de este viaje." },
    { id: "last-day-02", text: "Este viaje llega hoy a su último día." },
  ],
  weather_attention_candidate: [
    { id: "weather-01", text: "Quizás sea un buen momento para considerar el clima." },
    { id: "weather-02", text: "El clima puede ser relevante para este momento del viaje." },
  ],
  light_moment_candidate: [
    { id: "light-01", text: "Puede ser un buen momento para disfrutar la luz natural." },
    { id: "light-02", text: "La luz natural acompaña este momento del viaje." },
  ],
} as const;

describe("editorial-v1 catalog", () => {
  it("contains the ten exact approved fixtures with two unique variants per kind", () => {
    expect(EDITORIAL_V1_CATALOG).toMatchObject({ version: "editorial-v1", locale: "es-CL", entries: EXPECTED });
    expect(Object.values(EDITORIAL_V1_CATALOG.entries).flat()).toHaveLength(10);
    expect(new Set(Object.values(EDITORIAL_V1_CATALOG.entries).flat().map(({ id }) => id)).size).toBe(10);
    expect(validateEditorialCatalog(EDITORIAL_V1_CATALOG)).toBe(EDITORIAL_V1_CATALOG);
  });

  it("is deeply frozen and has no v1 placeholders", () => {
    expect(Object.isFrozen(EDITORIAL_V1_CATALOG)).toBe(true);
    expect(Object.isFrozen(EDITORIAL_V1_CATALOG.entries.trip_start_today)).toBe(true);
    expect(Object.isFrozen(EDITORIAL_V1_CATALOG.entries.trip_start_today[0])).toBe(true);
    expect(EDITORIAL_V1_PLACEHOLDERS).toEqual([]);
    expect(Object.isFrozen(EDITORIAL_V1_PLACEHOLDERS)).toBe(true);
  });
});
