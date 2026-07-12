import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TripsPage from "./TripsPage";

const { listTrips, logoutMutate } = vi.hoisted(() => ({
  listTrips: vi.fn(),
  logoutMutate: vi.fn(),
}));

vi.mock("@/features/trips/api/tripsApi", async (orig) => ({
  ...(await orig<typeof import("@/features/trips/api/tripsApi")>()),
  listTrips,
}));

vi.mock("@/features/auth/hooks/useSession", () => ({
  useSession: () => ({ user: { email: "kari@alaia.test" } }),
}));

vi.mock("@/features/auth/hooks/useLogout", () => ({
  useLogout: () => ({ mutate: logoutMutate }),
}));

const destination = {
  countryCode: "AR",
  countryName: "Argentina",
  cityId: "nomi-111",
  cityName: "Buenos Aires",
  adminName: "CABA",
  latitude: -34.6037,
  longitude: -58.3816,
  timezone: "America/Argentina/Buenos_Aires",
};

function trip(overrides = {}) {
  return {
    id: "trip-1",
    title: "Viaje activo",
    destination,
    baseStoryId: "ba-2026",
    status: "active",
    role: "owner",
    updatedAt: "2026-07-10T12:00:00.000Z",
    startDateTime: "2026-07-18T09:30",
    endDateTime: "2026-07-21T22:00",
    ...overrides,
  };
}

function renderTripsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/trips"]}>
        <TripsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("TripsPage", () => {
  it("ya no incrusta el formulario completo de feedback", async () => {
    listTrips.mockResolvedValue({ trips: [trip()] });

    renderTripsPage();

    expect(await screen.findByRole("heading", { name: "Viaje activo" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Categoría")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mensaje")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enviar sugerencia/i })).not.toBeInTheDocument();
  });

  it("deja un enlace discreto a /feedback cuando el feature flag está activo", async () => {
    listTrips.mockResolvedValue({ trips: [trip()] });

    renderTripsPage();

    const link = await screen.findByRole("link", { name: "Enviar sugerencia →" });
    expect(screen.getByRole("heading", { name: "Ayúdanos a mejorar Alaia" })).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/feedback");
  });

  it("oculta el bloque de feedback cuando VITE_ENABLE_FEEDBACK está desactivado", async () => {
    vi.stubEnv("VITE_ENABLE_FEEDBACK", "false");
    listTrips.mockResolvedValue({ trips: [trip()] });

    renderTripsPage();

    expect(await screen.findByRole("heading", { name: "Viaje activo" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ayúdanos a mejorar Alaia" })).not.toBeInTheDocument();
  });

  it("no duplica el viaje activo en el índice inferior", async () => {
    listTrips.mockResolvedValue({ trips: [trip()] });

    const { container } = renderTripsPage();

    expect(await screen.findByRole("heading", { name: "Viaje activo" })).toBeInTheDocument();
    expect(container.querySelector(".trips-index")).toBeNull();
    expect(screen.getByRole("button", { name: "+ Un nuevo viaje" })).toBeInTheDocument();
  });

  it("muestra otras historias excluyendo por trip.id el viaje activo", async () => {
    listTrips.mockResolvedValue({
      trips: [
        trip({ id: "active", title: "Viaje activo" }),
        trip({
          id: "other",
          title: "Escapada a Mendoza",
          updatedAt: "2026-07-01T12:00:00.000Z",
          status: "archived",
          startDateTime: undefined,
          endDateTime: undefined,
        }),
      ],
    });

    renderTripsPage();

    expect(await screen.findByRole("heading", { name: "Viaje activo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Otras historias" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /escapada a mendoza/i })).toHaveAttribute("href", "/trips/other");
  });

  it("sin historia activa muestra el índice completo", async () => {
    listTrips.mockResolvedValue({
      trips: [
        trip({ id: "archived-1", title: "Mendoza", status: "archived", startDateTime: undefined, endDateTime: undefined }),
        trip({ id: "archived-2", title: "Valparaíso", status: "archived", startDateTime: undefined, endDateTime: undefined }),
      ],
    });

    renderTripsPage();

    expect(await screen.findByRole("link", { name: /mendoza/i })).toHaveAttribute("href", "/trips/archived-1");
    expect(screen.getByRole("link", { name: /valparaíso/i })).toHaveAttribute("href", "/trips/archived-2");
    expect(screen.queryByRole("heading", { name: "Otras historias" })).not.toBeInTheDocument();
  });
});
