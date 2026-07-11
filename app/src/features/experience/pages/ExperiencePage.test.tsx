import { readFileSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
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

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <ExperiencePage />
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
  it("DEV: monta la demo de BA cuando NO hay tripId (import.meta.env.DEV=true)", async () => {
    // En el entorno de test import.meta.env.DEV es true (dev-like).
    renderAt("/experience");
    expect(await screen.findByText("Buenos Aires, 2026")).toBeInTheDocument();
    expect(getTrip).not.toHaveBeenCalled();
  });

  it("PRODUCCIÓN: /experience sin tripId NO carga Buenos Aires — redirige controladamente a /trips", () => {
    vi.stubEnv("DEV", false);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/experience"]}>
          <Routes>
            <Route path="/experience" element={<ExperiencePage />} />
            <Route path="/trips" element={<div>lista de viajes</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Redirección controlada, sin fallback implícito a Buenos Aires.
    expect(screen.getByText("lista de viajes")).toBeInTheDocument();
    expect(screen.queryByText("Buenos Aires, 2026")).not.toBeInTheDocument();
    expect(getTrip).not.toHaveBeenCalled();
  });
});

describe("ExperiencePage (resolución por viaje real vía connected)", () => {
  it("trip con baseStoryId ba-2026 → renderiza la historia resuelta, no un import estático (punto 8.1)", async () => {
    // El contenido real lo trae getStory (no un import estático); usamos el
    // package real de BA como respuesta de red simulada.
    const { demoStoryPackage } = await import("../data/demoStory");
    getTrip.mockResolvedValue({ trip: baTrip("trip-ba") });
    getStory.mockResolvedValue({ story: { storyId: "ba-2026", storyPackage: demoStoryPackage } });

    renderAt("/experience?tripId=trip-ba");

    expect(await screen.findByText("Buenos Aires, 2026")).toBeInTheDocument();
    expect(getTrip).toHaveBeenCalledWith("trip-ba");
    expect(getStory).toHaveBeenCalledWith("ba-2026");
  });

  it("trip con baseStoryId null → estado honesto EMPTY, nunca Buenos Aires (punto 8.3)", async () => {
    getTrip.mockResolvedValue({ trip: { ...baTrip("trip-sin"), baseStoryId: null } });

    renderAt("/experience?tripId=trip-sin");

    expect(await screen.findByText("Tu historia todavía no está lista.")).toBeInTheDocument();
    expect(screen.queryByText("Buenos Aires, 2026")).not.toBeInTheDocument();
    expect(getStory).not.toHaveBeenCalled();
  });

  it("baseStoryId presente pero inexistente en el catálogo (getStory 404) → mismo EMPTY honesto, nunca BA (punto 8.4)", async () => {
    getTrip.mockResolvedValue({ trip: { ...baTrip("trip-x"), baseStoryId: "historia-fantasma" } });
    getStory.mockRejectedValue(new PlatformApiError("no existe", 404, "/api/stories/historia-fantasma"));

    renderAt("/experience?tripId=trip-x");

    expect(await screen.findByText("Tu historia todavía no está lista.")).toBeInTheDocument();
    expect(screen.queryByText("Buenos Aires, 2026")).not.toBeInTheDocument();
  });

  it("trip inexistente/no accesible (getTrip 404) → not-found honesto, distinto de un crash (punto 8.8)", async () => {
    getTrip.mockRejectedValue(new PlatformApiError("403", 403, "/api/trips/fantasma"));

    renderAt("/experience?tripId=fantasma");

    expect(await screen.findByText("No encontramos este viaje.")).toBeInTheDocument();
    expect(screen.queryByText("Tu historia todavía no está lista.")).not.toBeInTheDocument();
    expect(screen.queryByText("Buenos Aires, 2026")).not.toBeInTheDocument();
  });
});

// Punto 8.7 — blindaje explícito: el import estático de BA solo puede usarse en el
// branch local, y ningún trip conectado renderiza BA por defecto.
describe("ExperiencePage — blindaje anti-fallback a Buenos Aires (punto 8.7)", () => {
  it("el código fuente solo referencia demoStoryPackage en el branch kind:local", () => {
    const source = readFileSync("src/features/experience/pages/ExperiencePage.tsx", "utf8");
    // Descarta el preámbulo (imports + ExperienceRuntime) y deja los cuerpos de
    // cada `case`. El import de demoStoryPackage vive en el preámbulo; acá solo
    // interesa QUÉ branch lo USA.
    const caseBodies = source.split(/case "/).slice(1);
    const localBody = caseBodies.find((chunk) => chunk.startsWith("local"));
    const otherBodies = caseBodies.filter((chunk) => !chunk.startsWith("local"));

    expect(localBody).toContain("demoStoryPackage");
    for (const body of otherBodies) {
      expect(body).not.toContain("demoStoryPackage");
    }
  });

  it("un trip sin historia NO renderiza Buenos Aires (comportamiento, no solo código)", async () => {
    getTrip.mockResolvedValue({ trip: { ...baTrip("trip-otro"), baseStoryId: null } });
    renderAt("/experience?tripId=trip-otro");
    expect(await screen.findByText("Tu historia todavía no está lista.")).toBeInTheDocument();
    expect(screen.queryByText("Buenos Aires, 2026")).not.toBeInTheDocument();
  });
});
