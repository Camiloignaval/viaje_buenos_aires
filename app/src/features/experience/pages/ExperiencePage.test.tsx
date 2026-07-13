import { readFileSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryCache, QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { sessionQueryKey } from "@/features/auth/hooks/useSession";
import { handleAuthError } from "@/providers/authErrorHandler";
import { PlatformApiError } from "@/services/platformClient";
import ExperiencePage from "./ExperiencePage";

// Red mockeada: la resolución de historia depende de getTrip (viaje) y getStory
// (contenido). Se controlan por test para ejercitar cada estado sin backend.
const { getTrip, getStory, getTripMedia } = vi.hoisted(() => ({
  getTrip: vi.fn(),
  getStory: vi.fn(),
  getTripMedia: vi.fn(async () => ({ media: [] })),
}));
vi.mock("@/features/trips/api/tripsApi", async (orig) => ({
  ...(await orig<typeof import("@/features/trips/api/tripsApi")>()),
  getTrip,
}));
vi.mock("@/features/connected/api/connectedApi", async (orig) => ({
  ...(await orig<typeof import("@/features/connected/api/connectedApi")>()),
  getStory,
  getTripMedia,
}));

// jsdom no implementa HTMLMediaElement.play — la intro llama video.play().
beforeAll(() => {
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

const authenticatedUser = {
  id: "user-1",
  email: "kari@example.com",
  onboardingCompleted: true,
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function createTestQueryClient(
  user: typeof authenticatedUser | null = authenticatedUser,
  handleData401 = false,
) {
  let client: QueryClient;
  const queryCache = new QueryCache({
    onError: (error) => {
      if (handleData401) handleAuthError(client, error);
    },
  });
  client = new QueryClient({
    queryCache,
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(sessionQueryKey, { user });
  return client;
}

function renderAt(
  path: string,
  {
    user = authenticatedUser,
    handleData401 = false,
  }: {
    user?: typeof authenticatedUser | null;
    handleData401?: boolean;
  } = {},
) {
  const queryClient = createTestQueryClient(user, handleData401);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/experience" element={<ExperiencePage />} />
          <Route
            path="/login"
            element={
              <>
                <div>Inicio de sesión destino</div>
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/onboarding"
            element={
              <>
                <div>Onboarding destino</div>
                <LocationProbe />
              </>
            }
          />
          <Route path="/trips" element={<div>Lista de viajes destino</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const baTrip = (id: string) => ({
  id,
  title: "Buenos Aires",
  destination: "Buenos Aires",
  baseStoryId: "ba-2026",
  status: "active",
  role: "owner",
  updatedAt: "2026-07-09T12:00:00.000Z",
});

describe("ExperiencePage (demo local sin tripId)", () => {
  it("DEV: monta la demo de BA sin consultar auth ni mostrar una salida de viaje conectado", async () => {
    renderAt("/experience");

    expect(await screen.findByText("Buenos Aires, 2026")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "← Volver a Mis viajes" })).not.toBeInTheDocument();
    expect(getTrip).not.toHaveBeenCalled();
  });

  it("PRODUCCIÓN: /experience sin tripId conserva la redirección controlada a /trips", () => {
    vi.stubEnv("DEV", false);
    renderAt("/experience");

    expect(screen.getByText("Lista de viajes destino")).toBeInTheDocument();
    expect(screen.queryByText("Buenos Aires, 2026")).not.toBeInTheDocument();
    expect(getTrip).not.toHaveBeenCalled();
  });
});

describe("ExperiencePage (gates de la rama conectada)", () => {
  it("una sesión ausente redirige el deep link exacto antes de consultar el viaje", async () => {
    renderAt("/experience?tripId=trip-ba&preview=1", { user: null });

    expect(await screen.findByText("Inicio de sesión destino")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/login?returnTo=%2Fexperience%3FtripId%3Dtrip-ba%26preview%3D1",
    );
    expect(getTrip).not.toHaveBeenCalled();
    expect(getStory).not.toHaveBeenCalled();
  });

  it("onboarding incompleto también corta antes de las queries conectadas", async () => {
    renderAt("/experience?tripId=trip-ba", {
      user: { ...authenticatedUser, onboardingCompleted: false },
    });

    expect(await screen.findByText("Onboarding destino")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/onboarding?returnTo=%2Fexperience%3FtripId%3Dtrip-ba",
    );
    expect(getTrip).not.toHaveBeenCalled();
    expect(getStory).not.toHaveBeenCalled();
  });

  it("una sesión válida renderiza la historia y mantiene la navegación a Mis viajes", async () => {
    const { demoStoryPackage } = await import("../data/demoStory");
    getTrip.mockResolvedValue({ trip: baTrip("trip-ba") });
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: demoStoryPackage } });

    renderAt("/experience?tripId=trip-ba");

    expect(await screen.findByText("Buenos Aires, 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Volver a Mis viajes" })).toHaveAttribute("href", "/trips");
    expect(getTrip).toHaveBeenCalledWith("trip-ba");
    expect(getStory).toHaveBeenCalledWith("ba-2026");
  });

  it("oculta la salida global cuando Preparativos ya ofrece su regreso contextual", async () => {
    const { demoStoryPackage } = await import("../data/demoStory");
    getTrip.mockResolvedValue({ trip: baTrip("trip-ba") });
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: demoStoryPackage } });

    renderAt("/experience?tripId=trip-ba");

    expect(await screen.findByRole("link", { name: "← Volver a Mis viajes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Preparativos/ }));

    expect(screen.getByRole("heading", { name: "Preparativos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← Volver al índice" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "← Volver a Mis viajes" })).not.toBeInTheDocument();
  });

  it("un 401 posterior a una sesión cacheada vuelve al login, no al error de Experience", async () => {
    getTrip.mockRejectedValue(
      new PlatformApiError("Sesión vencida", 401, "/api/trips/trip-ba"),
    );

    renderAt("/experience?tripId=trip-ba", { handleData401: true });

    expect(await screen.findByText("Inicio de sesión destino")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/login?returnTo=%2Fexperience%3FtripId%3Dtrip-ba",
    );
    expect(screen.queryByText("Algo se interrumpió.")).not.toBeInTheDocument();
    expect(getStory).not.toHaveBeenCalled();
  });
});

describe("ExperiencePage (resolución por viaje real vía connected)", () => {
  it("trip con baseStoryId ba-2026 renderiza la historia resuelta, no un import estático", async () => {
    const { demoStoryPackage } = await import("../data/demoStory");
    getTrip.mockResolvedValue({ trip: baTrip("trip-ba") });
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: demoStoryPackage } });

    renderAt("/experience?tripId=trip-ba");

    expect(await screen.findByText("Buenos Aires, 2026")).toBeInTheDocument();
    expect(getTrip).toHaveBeenCalledWith("trip-ba");
    expect(getStory).toHaveBeenCalledWith("ba-2026");
  });

  it("trip con baseStoryId null muestra EMPTY, nunca Buenos Aires", async () => {
    getTrip.mockResolvedValue({ trip: { ...baTrip("trip-sin"), baseStoryId: null } });

    renderAt("/experience?tripId=trip-sin");

    expect(await screen.findByText("Tu historia todavía no está lista.")).toBeInTheDocument();
    expect(screen.queryByText("Buenos Aires, 2026")).not.toBeInTheDocument();
    expect(getStory).not.toHaveBeenCalled();
  });

  it("baseStoryId inexistente en el catálogo muestra EMPTY, nunca BA", async () => {
    getTrip.mockResolvedValue({ trip: { ...baTrip("trip-x"), baseStoryId: "historia-fantasma" } });
    getStory.mockRejectedValue(
      new PlatformApiError("no existe", 404, "/api/stories/historia-fantasma"),
    );

    renderAt("/experience?tripId=trip-x");

    expect(await screen.findByText("Tu historia todavía no está lista.")).toBeInTheDocument();
    expect(screen.queryByText("Buenos Aires, 2026")).not.toBeInTheDocument();
  });

  it("trip inexistente/no accesible muestra not-found honesto", async () => {
    getTrip.mockRejectedValue(new PlatformApiError("403", 403, "/api/trips/fantasma"));

    renderAt("/experience?tripId=fantasma");

    expect(await screen.findByText("No encontramos este viaje.")).toBeInTheDocument();
    expect(screen.queryByText("Tu historia todavía no está lista.")).not.toBeInTheDocument();
    expect(screen.queryByText("Buenos Aires, 2026")).not.toBeInTheDocument();
  });
});

// Blindaje explícito: el package estático de BA solo puede usarse en la rama
// local, y ningún trip conectado lo referencia como fallback.
describe("ExperiencePage — blindaje anti-fallback a Buenos Aires", () => {
  it("la rama ConnectedExperience no referencia demoStoryPackage", () => {
    const source = readFileSync("src/features/experience/pages/ExperiencePage.tsx", "utf8");
    const connectedStart = source.indexOf("function ConnectedExperience()");
    const connectedEnd = source.indexOf("// Ruta /experience", connectedStart);
    const connectedSource = source.slice(connectedStart, connectedEnd);

    expect(connectedSource).not.toContain("demoStoryPackage");
    expect(source.slice(connectedEnd)).toContain("demoStoryPackage");
  });

  it("un trip sin historia NO renderiza Buenos Aires", async () => {
    getTrip.mockResolvedValue({ trip: { ...baTrip("trip-otro"), baseStoryId: null } });

    renderAt("/experience?tripId=trip-otro");

    expect(await screen.findByText("Tu historia todavía no está lista.")).toBeInTheDocument();
    expect(screen.queryByText("Buenos Aires, 2026")).not.toBeInTheDocument();
  });
});
