import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Trip } from "@/features/trips/types";
import { weatherContextQueryOptions } from "./weatherContextQuery";

const { fetchWeatherContext } = vi.hoisted(() => ({ fetchWeatherContext: vi.fn() }));
vi.mock("./weatherContextClient", () => ({ fetchWeatherContext }));

const trip: Trip = {
  id: "trip-weather", title: "Viaje", baseStoryId: "ba-2026", status: "active", role: "owner",
  updatedAt: "2026-07-15T12:00:00Z", startDateTime: "2026-07-15", endDateTime: "2026-07-18",
  destination: {
    countryCode: "AR", countryName: "Argentina", cityId: "ba", cityName: "Buenos Aires",
    latitude: -34.6037, longitude: -58.3816, timezone: "America/Argentina/Buenos_Aires",
  },
};

describe("weatherContextQuery", () => {
  beforeEach(() => fetchWeatherContext.mockReset());

  it("identifica Weather sin exponer coordenadas y alinea la frescura con el cache", async () => {
    const snapshot = { value: { condition: "clear" }, fetchedAt: "2026-07-15T15:00:00.000Z", source: "provider" };
    fetchWeatherContext.mockResolvedValueOnce(snapshot);
    const options = weatherContextQueryOptions(trip, new Date("2026-07-15T15:00:00.000Z"));

    expect(options).toMatchObject({
      enabled: true,
      staleTime: 900_000,
      retry: false,
      queryKey: ["context-engine", "weather", "ba", "America/Argentina/Buenos_Aires", "2026-07-15"],
    });
    expect(JSON.stringify(options.queryKey)).not.toMatch(/-34\.6037|-58\.3816/);

    await expect(options.queryFn({ signal: new AbortController().signal } as never)).resolves.toBe(snapshot);
    expect(fetchWeatherContext).toHaveBeenCalledWith({
      latitude: -34.6037,
      longitude: -58.3816,
      timezone: "America/Argentina/Buenos_Aires",
      localDate: "2026-07-15",
      signal: expect.any(AbortSignal),
    });
  });

  it("deshabilita Weather fuera de ventana sin ejecutar el cliente", () => {
    const options = weatherContextQueryOptions(
      { ...trip, status: "archived" },
      new Date("2026-07-15T15:00:00.000Z"),
    );

    expect(options.enabled).toBe(false);
    expect(options.queryKey).toEqual(["context-engine", "weather", "unavailable", "unavailable", "unavailable"]);
    expect(fetchWeatherContext).not.toHaveBeenCalled();
  });

  it("convierte una respuesta fallida en error categorizable sin filtrar su contenido", async () => {
    fetchWeatherContext.mockResolvedValueOnce(null);
    const options = weatherContextQueryOptions(trip, new Date("2026-07-15T15:00:00.000Z"));

    await expect(options.queryFn({ signal: new AbortController().signal } as never)).rejects.toThrow("weather_query_failed");

    fetchWeatherContext.mockRejectedValueOnce(new Error("kari@example.com token=secret -34.6037,-58.3816"));
    await expect(options.queryFn({ signal: new AbortController().signal } as never)).rejects.toThrow(/^weather_query_failed$/);
  });
});
