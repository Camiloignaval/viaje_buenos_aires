import { describe, expect, it } from "vitest";
import type { Trip } from "../types";
import { resolveInitialAlaiaDestination, resolveTripLifecycle } from "./initialDestination";

const BASE_TRIP: Trip = {
  id: "trip-1",
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
  baseStoryId: "ba-2026",
  status: "active",
  role: "owner",
  updatedAt: "2026-07-01T12:00:00.000Z",
  startDateTime: "2026-07-18T09:30",
  endDateTime: "2026-07-21T22:00",
};

describe("resolveInitialAlaiaDestination", () => {
  it("envía usuarios sin viaje activo al Home general", () => {
    expect(resolveInitialAlaiaDestination([], new Date("2026-07-10T12:00:00Z"))).toEqual({
      kind: "general-home",
      route: "/trips",
      reason: "no-trips",
    });
  });

  it("envía usuarios con viaje futuro a la portada/dashboard del viaje, no a Experience", () => {
    const destination = resolveInitialAlaiaDestination(
      [BASE_TRIP],
      new Date("2026-07-10T12:00:00-03:00"),
    );

    expect(destination.kind).toBe("active-trip-home");
    expect(destination.route).toBe("/trips");
    expect(destination).toMatchObject({ lifecycle: "upcoming" });
  });

  it("resuelve viaje en curso como dashboard activo sin navegación automática a Experience", () => {
    const destination = resolveInitialAlaiaDestination(
      [BASE_TRIP],
      new Date("2026-07-19T12:00:00-03:00"),
    );

    expect(destination.kind).toBe("active-trip-home");
    expect(destination.route).not.toContain("/experience");
    expect(destination).toMatchObject({ lifecycle: "in-progress" });
  });

  it("ignora viajes finalizados o archivados como destino inicial activo", () => {
    const pastTrip: Trip = {
      ...BASE_TRIP,
      startDateTime: "2026-07-01T09:30",
      endDateTime: "2026-07-02T22:00",
    };
    const archivedTrip: Trip = { ...BASE_TRIP, id: "trip-2", status: "archived" };

    expect(
      resolveInitialAlaiaDestination(
        [archivedTrip, pastTrip],
        new Date("2026-07-10T12:00:00-03:00"),
      ),
    ).toEqual({ kind: "general-home", route: "/trips", reason: "no-active-trip" });
  });

  it("clasifica el día de inicio y mantiene el estado temporal real", () => {
    const result = resolveTripLifecycle(BASE_TRIP, new Date("2026-07-18T12:00:00-03:00"));

    expect(result.lifecycle).toBe("starting-today");
    expect(result.temporalState).toEqual({ kind: "today" });
  });
});
