import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWeatherContext } from "./weatherContextClient";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

const request = { tripId: "trip-weather", latitude: -34.6037, longitude: -58.3816, timezone: "America/Argentina/Buenos_Aires", localDate: "2026-10-03" };
const snapshot = {
  value: {
    condition: "clear", temperatureC: 22, precipitationProbability: 5,
    isRaining: false, isStorm: false, isSnow: false,
    sunrise: { localDateTime: "2026-10-03T06:30", timezone: request.timezone },
    sunset: { localDateTime: "2026-10-03T19:10", timezone: request.timezone },
    effectiveAt: { localDateTime: "2026-10-03T12:00", timezone: request.timezone },
    expiresAt: "2026-10-03T15:15:00.000Z", confidence: "unknown",
  },
  fetchedAt: "2026-10-03T15:00:00.000Z", source: "open-meteo",
};

const wireSnapshot = { available: true, value: snapshot.value, fetchedAt: snapshot.fetchedAt };

describe("fetchWeatherContext", () => {
  it("envía las coordenadas solo en el body autenticado y devuelve el contrato normalizado", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(wireSnapshot), { status: 200 }));
    await expect(fetchWeatherContext(request)).resolves.toEqual({ ...snapshot, source: "weather" });
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/context/weather", expect.objectContaining({ method: "POST", credentials: "include", body: JSON.stringify(request) }));
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).not.toContain("34.6037");
  });

  it("descarta respuestas runtime incompletas sin filtrar payload parcial", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ ...wireSnapshot, value: { condition: "clear" } }), { status: 200 }));
    await expect(fetchWeatherContext(request)).resolves.toBeNull();
  });

  it("rechaza timestamps que contradicen timezone o fecha del Trip", async () => {
    const mismatched = {
      ...wireSnapshot,
      value: {
        ...snapshot.value,
        effectiveAt: { localDateTime: "2026-10-04T12:00", timezone: "America/New_York" },
      },
    };
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(mismatched), { status: 200 }));

    await expect(fetchWeatherContext(request)).resolves.toBeNull();
  });

  it("degrada status no exitoso y error de red a null", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: "coords=-34.6 token=secret" }), { status: 502 }));
    await expect(fetchWeatherContext(request)).resolves.toBeNull();
    globalThis.fetch = vi.fn(async () => { throw new Error("coords=-34.6 token=secret"); });
    await expect(fetchWeatherContext(request)).resolves.toBeNull();
  });

  it("degrada el gate unavailable sin exponer detalles de configuracion", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ available: false }), { status: 200 }));

    await expect(fetchWeatherContext(request)).resolves.toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
