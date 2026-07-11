import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { PlatformApiError } from "@/services/platformClient";
import TripHomePage from "./TripHomePage";

const { getTrip, getStory } = vi.hoisted(() => ({ getTrip: vi.fn(), getStory: vi.fn() }));
vi.mock("@/features/trips/api/tripsApi", async (orig) => ({
  ...(await orig<typeof import("@/features/trips/api/tripsApi")>()),
  getTrip,
}));
vi.mock("@/features/connected/api/connectedApi", async (orig) => ({
  ...(await orig<typeof import("@/features/connected/api/connectedApi")>()),
  getStory,
}));

beforeAll(() => {
  // La Portada no monta video, pero mantiene la paridad con el resto de la suite.
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
});
afterEach(() => vi.clearAllMocks());

const trip = (overrides = {}) => ({
  id: "trip-1",
  title: "Buenos Aires en familia",
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
  ...overrides,
});

function renderPortada() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/trips/trip-1"]}>
        <Routes>
          <Route path="trips/:tripId" element={<TripHomePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TripHomePage (Portada del viaje)", () => {
  it("READY: muestra el viaje y el CTA voluntario 'Entrar al viaje' → Experience", async () => {
    const { auroraStoryPackage } = await import("@/features/experience/data/auroraStory");
    getTrip.mockResolvedValue({ trip: trip() });
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: auroraStoryPackage } });

    renderPortada();

    expect(await screen.findByRole("heading", { name: "Buenos Aires en familia" })).toBeInTheDocument();
    const cta = await screen.findByRole("link", { name: "Entrar al viaje" });
    expect(cta).toHaveAttribute("href", "/experience?tripId=trip-1");
  });

  it("EMPTY: viaje sin historia → estado honesto, sin CTA de entrada, nunca redirige", async () => {
    getTrip.mockResolvedValue({ trip: trip({ baseStoryId: null }) });

    renderPortada();

    expect(await screen.findByRole("heading", { name: "Buenos Aires en familia" })).toBeInTheDocument();
    expect(screen.getByText(/tu historia todavía no está lista/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Entrar al viaje" })).not.toBeInTheDocument();
    expect(getStory).not.toHaveBeenCalled();
  });

  it("NOT-FOUND: viaje inexistente/no accesible → estado honesto not-found", async () => {
    getTrip.mockRejectedValue(new PlatformApiError("403", 403, "/api/trips/trip-1"));

    renderPortada();

    expect(await screen.findByText("No encontramos este viaje.")).toBeInTheDocument();
  });
});
