import { describe, expect, it } from "vitest";
import { personalEditorialMessage } from "./personalMessage";
import type { Trip } from "@/features/trips/types";

const destination = {
  countryCode: "CL",
  countryName: "Chile",
  cityId: "valparaiso",
  cityName: "Valparaíso",
  latitude: -33.0472,
  longitude: -71.6127,
  timezone: "America/Santiago",
};

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    title: "Valparaíso",
    destination,
    baseStoryId: null,
    status: "active",
    role: "owner",
    updatedAt: "2026-07-10T12:00:00.000Z",
    startDateTime: "2026-07-18T09:00",
    endDateTime: "2026-07-21T20:00",
    ...overrides,
  };
}

describe("personalEditorialMessage", () => {
  it("escribe una bienvenida propia cuando aún no hay viajes", () => {
    expect(personalEditorialMessage([], new Date("2026-07-10T12:00:00-04:00")).kind).toBe("empty");
  });

  it.each([
    ["before-trip", "2026-07-10T12:00:00-04:00"],
    ["during-trip", "2026-07-19T12:00:00-04:00"],
    ["last-day", "2026-07-21T12:00:00-04:00"],
    ["after-trip", "2026-07-24T12:00:00-04:00"],
    ["distant-memory", "2026-08-10T12:00:00-04:00"],
  ] as const)("elige el mensaje editorial %s", (kind, now) => {
    expect(personalEditorialMessage([trip()], new Date(now)).kind).toBe(kind);
  });
});
