import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { PlatformApiError } from "@/services/platformClient";
import TripHomePage from "./TripHomePage";

const { getTrip, getStory, getPushPreferences } = vi.hoisted(() => ({
  getTrip: vi.fn(),
  getStory: vi.fn(),
  getPushPreferences: vi.fn(),
}));
vi.mock("@/features/trips/api/tripsApi", async (orig) => ({
  ...(await orig<typeof import("@/features/trips/api/tripsApi")>()),
  getTrip,
}));
vi.mock("@/features/connected/api/connectedApi", async (orig) => ({
  ...(await orig<typeof import("@/features/connected/api/connectedApi")>()),
  getStory,
}));
vi.mock("@/features/pwa/pushApi", () => ({ getPushPreferences }));
vi.mock("@/features/auth/hooks/useSession", () => ({
  useSession: () => ({
    status: "authenticated",
    user: {
      id: "user-1",
      email: "private@example.com",
      displayName: "Kari",
      residenceCountryCode: "CL",
      preferredCurrency: "CLP",
      emailVerifiedAt: "2026-07-01T12:00:00.000Z",
      onboardingCompleted: true,
    },
    refetch: vi.fn(),
  }),
}));

beforeAll(() => {
  // La Portada no monta video, pero mantiene la paridad con el resto de la suite.
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

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

function renderPortada(tripsIndex = <div>Mis viajes destino</div>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/trips/trip-1"]}>
        <Routes>
          <Route path="trips/:tripId" element={<TripHomePage />} />
          <Route path="trips" element={tripsIndex} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function preferences(enabled: boolean) {
  return { preferences: { enabled, beforeTrip: true, duringTrip: true, afterTrip: true, futureMemories: true } };
}

beforeEach(() => {
  window.sessionStorage.clear();
  getPushPreferences.mockResolvedValue(preferences(false));
});

describe("TripHomePage (Portada del viaje)", () => {
  it("READY: muestra el viaje y el CTA voluntario 'Entrar al viaje' → Experience", async () => {
    const { demoStoryPackage } = await import("@/features/experience/data/demoStory");
    getTrip.mockResolvedValue({ trip: trip() });
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: demoStoryPackage } });

    renderPortada();

    expect(await screen.findByRole("heading", { name: "Buenos Aires en familia" })).toBeInTheDocument();
    const cta = await screen.findByRole("link", { name: "Entrar al viaje" });
    expect(cta).toHaveAttribute("href", "/experience?tripId=trip-1");
  });

  it("muestra navegación editorial para volver a Mis viajes", async () => {
    const { demoStoryPackage } = await import("@/features/experience/data/demoStory");
    getTrip.mockResolvedValue({ trip: trip() });
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: demoStoryPackage } });

    renderPortada();

    const back = await screen.findByRole("link", { name: "← Volver a Mis viajes" });
    expect(back).toHaveAttribute("href", "/trips");
  });

  it("vuelve a /trips manteniendo SPA y accesibilidad de teclado", async () => {
    const user = userEvent.setup();
    const { demoStoryPackage } = await import("@/features/experience/data/demoStory");
    getTrip.mockResolvedValue({ trip: trip() });
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: demoStoryPackage } });

    renderPortada();

    const back = await screen.findByRole("link", { name: "← Volver a Mis viajes" });
    back.focus();
    expect(back).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Mis viajes destino")).toBeInTheDocument();
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

  it("monta el momento visible solo tras el pipeline real de cinco motores y mantiene el CTA", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-18T15:00:00.000Z"));
    const { demoStoryPackage } = await import("@/features/experience/data/demoStory");
    getTrip.mockResolvedValue({ trip: trip() });
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: demoStoryPackage } });
    getPushPreferences.mockResolvedValue(preferences(true));

    renderPortada();

    const moment = await screen.findByRole("complementary", { name: "Alaia" });
    expect(moment).toHaveTextContent("Hoy comienza una nueva historia.");
    expect(screen.queryByText(/la historia empieza hoy/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar al viaje" })).toHaveAttribute(
      "href",
      "/experience?tripId=trip-1",
    );
    expect(getPushPreferences).toHaveBeenCalled();
  });

  it("restaura el receipt visible tras un remount equivalente a reload de la pestaña", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-18T15:00:00.000Z"));
    const { demoStoryPackage } = await import("@/features/experience/data/demoStory");
    getTrip.mockResolvedValue({ trip: trip() });
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: demoStoryPackage } });
    getPushPreferences.mockResolvedValue(preferences(true));

    const first = renderPortada();
    expect(await screen.findByRole("complementary", { name: "Alaia" })).toBeInTheDocument();
    first.unmount();

    const second = renderPortada();
    await screen.findByRole("link", { name: "Entrar al viaje" });
    await vi.waitFor(() => expect(getPushPreferences).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("complementary", { name: "Alaia" })).not.toBeInTheDocument();
    expect(second.container.querySelector(".visible-companion-experience")).toBeNull();
    expect(second.container.querySelector(".active-trip-home-companion-moment")).toBeNull();
  });

  it("aísla el trip scope al navegar y restaura el receipt al volver", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-18T15:00:00.000Z"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { demoStoryPackage } = await import("@/features/experience/data/demoStory");
    getTrip.mockImplementation(async (tripId: string) => ({ trip: trip({ id: tripId }) }));
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: demoStoryPackage } });
    getPushPreferences.mockResolvedValue(preferences(true));
    const index = (
      <div>
        <Link to="/trips/trip-1">Abrir viaje uno</Link>
        <Link to="/trips/trip-2">Abrir viaje dos</Link>
      </div>
    );

    renderPortada(index);
    expect(await screen.findByRole("complementary", { name: "Alaia" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "← Volver a Mis viajes" }));
    await user.click(await screen.findByRole("link", { name: "Abrir viaje dos" }));
    expect(await screen.findByRole("complementary", { name: "Alaia" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "← Volver a Mis viajes" }));
    await user.click(await screen.findByRole("link", { name: "Abrir viaje uno" }));

    await screen.findByRole("link", { name: "Entrar al viaje" });
    await vi.waitFor(() => expect(getPushPreferences).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole("complementary", { name: "Alaia" })).not.toBeInTheDocument();
  });

  it("un terminal silencioso conserva preparativos y no monta wrapper vacio", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-18T15:00:00.000Z"));
    const { demoStoryPackage } = await import("@/features/experience/data/demoStory");
    getTrip.mockResolvedValue({ trip: trip() });
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: demoStoryPackage } });
    getPushPreferences.mockResolvedValue(preferences(false));

    const { container } = renderPortada();

    expect(await screen.findByText(/la historia empieza hoy/i)).toBeInTheDocument();
    expect(container.querySelector(".visible-companion-experience")).toBeNull();
    expect(container.querySelector(".active-trip-home-companion-moment")).toBeNull();
  });

  it.each([
    ["trip_start_tomorrow", "2026-07-17T15:00:00.000Z", "timeline"],
    ["trip_last_day", "2026-07-21T15:00:00.000Z", "memory"],
  ] as const)("preserva el pipeline real %s/%s sin reescribirlo a in_app", async (_kind, instant, _channel) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(instant));
    const { demoStoryPackage } = await import("@/features/experience/data/demoStory");
    getTrip.mockResolvedValue({ trip: trip() });
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: demoStoryPackage } });
    getPushPreferences.mockResolvedValue(preferences(true));

    const { container } = renderPortada();
    await screen.findByRole("link", { name: "Entrar al viaje" });
    await vi.waitFor(() => expect(getPushPreferences).toHaveBeenCalledTimes(1));

    expect(container.querySelector(".visible-companion-experience")).toBeNull();
    expect(container.querySelector(".active-trip-home-companion-moment")).toBeNull();
    expect([...Array(window.sessionStorage.length)].map((_, index) => window.sessionStorage.key(index)))
      .not.toEqual(expect.arrayContaining([expect.stringMatching(/^alaia:visible-delivery:/)]));
  });
});
