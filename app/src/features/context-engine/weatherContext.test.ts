import { describe, expect, it } from "vitest";
import type { Trip } from "@/features/trips/types";
import { resolveWeatherEligibility, resolveWeatherSnapshot } from "./weatherContext";

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-weather", title: "New York",
    destination: { countryCode: "US", countryName: "United States", cityId: "new-york", cityName: "New York", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
    baseStoryId: null, status: "active", role: "owner", updatedAt: "2026-03-08T05:00:00.000Z",
    startDateTime: "2026-03-08", endDateTime: "2026-03-10", ...overrides,
  };
}

const snapshot = {
  value: {
    condition: "rain" as const, temperatureC: 11, precipitationProbability: 80,
    isRaining: true, isStorm: false, isSnow: false,
    sunrise: { localDateTime: "2026-03-08T07:12", timezone: "America/New_York" },
    sunset: { localDateTime: "2026-03-08T18:55", timezone: "America/New_York" },
    effectiveAt: { localDateTime: "2026-03-08T01:30", timezone: "America/New_York" },
    expiresAt: "2026-03-08T06:45:00.000Z", confidence: "unknown" as const,
  },
  fetchedAt: "2026-03-08T06:30:00.000Z", source: "open-meteo",
};

describe("Weather domain", () => {
  it("resuelve hoy en el destino durante el cruce DST sin usar la timezone del host", () => {
    expect(resolveWeatherEligibility({ trip: trip(), now: new Date("2026-03-08T06:30:00.000Z") })).toEqual({
      eligible: true,
      request: { latitude: 40.7128, longitude: -74.006, timezone: "America/New_York", localDate: "2026-03-08" },
    });
  });

  it("usa exclusivamente coordenadas y timezone del Trip en el cambio DST de otoño", () => {
    expect(resolveWeatherEligibility({
      trip: trip({ startDateTime: "2026-11-01", endDateTime: "2026-11-02" }),
      now: new Date("2026-11-01T05:30:00.000Z"), targetLocalDate: "2026-11-01",
    })).toMatchObject({ eligible: true, request: { latitude: 40.7128, longitude: -74.006, timezone: "America/New_York", localDate: "2026-11-01" } });
  });

  it("rechaza viajes fuera de curso o una fecha distinta de hoy local", () => {
    expect(resolveWeatherEligibility({ trip: trip({ status: "archived" }), now: new Date("2026-03-08T06:30:00.000Z") }))
      .toEqual({ eligible: false, reason: "weather_outside_window" });
    expect(resolveWeatherEligibility({ trip: trip(), now: new Date("2026-03-08T06:30:00.000Z"), targetLocalDate: "2026-03-09" }))
      .toEqual({ eligible: false, reason: "weather_outside_window" });
  });

  it("declara inputs faltantes sin inventar ubicación", () => {
    expect(resolveWeatherEligibility({ trip: trip({ destination: "New York" }), now: new Date("2026-03-08T06:30:00.000Z") }))
      .toEqual({ eligible: false, reason: "missing_weather_input" });
    expect(resolveWeatherEligibility({
      trip: trip({ destination: { ...trip().destination as Exclude<Trip["destination"], string>, latitude: 999 } }),
      now: new Date("2026-03-08T06:30:00.000Z"),
    })).toEqual({ eligible: false, reason: "missing_weather_input" });
  });

  it("deriva freshness del expiresAt y conserva confidence desconocida", () => {
    expect(resolveWeatherSnapshot(snapshot, new Date("2026-03-08T06:44:59.999Z"))).toMatchObject({
      status: "available", freshness: "fresh", value: { confidence: "unknown" },
      provenance: { owner: "adapter", source: "weather.provider", observedAt: snapshot.fetchedAt },
    });
    expect(resolveWeatherSnapshot(snapshot, new Date("2026-03-08T06:45:00.000Z"))).toMatchObject({ status: "available", freshness: "stale", value: { confidence: "unknown" } });
  });
});
