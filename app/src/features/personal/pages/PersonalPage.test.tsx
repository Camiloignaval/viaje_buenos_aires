import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PersonalPage from "./PersonalPage";

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

vi.mock("@/features/pwa/PwaInstallPrompt", () => ({
  PwaInstallPrompt: () => <section aria-label="Instalar Alaia">Instalar Alaia</section>,
}));

vi.mock("@/features/pwa/PushCompanion", () => ({
  PushCompanion: () => <section aria-label="Acompañamiento">Acompañamiento</section>,
}));

vi.mock("@/features/feedback/components/FeedbackSection", () => ({
  FeedbackSection: () => <section aria-label="Sugerencias">Sugerencias</section>,
}));

function renderPersonalPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/para-ustedes"]}>
        <PersonalPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("PersonalPage", () => {
  it("reúne los gestos personales fuera de la biblioteca", async () => {
    listTrips.mockResolvedValue({ trips: [] });

    renderPersonalPage();

    expect(await screen.findByRole("heading", { name: "Para ustedes" })).toBeInTheDocument();
    expect(screen.getByText(/Toda historia empieza/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Acompañamiento")).toBeInTheDocument();
    expect(screen.getByLabelText("Instalar Alaia")).toBeInTheDocument();
    expect(screen.getByLabelText("Sugerencias")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cuenta" })).toBeInTheDocument();
    expect(screen.getByText("kari@alaia.test")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Mis viajes" })).toHaveAttribute("href", "/trips");
  });
});
