import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlatformApiError } from "@/services/platformClient";
import InvitePage from "./InvitePage";
import type { InvitationPreview } from "../types";

const { useInvitationPreview } = vi.hoisted(() => ({ useInvitationPreview: vi.fn() }));
vi.mock("../hooks/useInvitationPreview", () => ({
  useInvitationPreview,
  invitationQueryKey: (t: string) => ["invitation", t],
}));

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock("@/features/auth/hooks/useSession", () => ({ useSession, sessionQueryKey: ["auth", "session"] }));

const { acceptInvitation, declineInvitation } = vi.hoisted(() => ({
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
}));
vi.mock("../api/invitationsApi", () => ({ acceptInvitation, declineInvitation, getInvitationPreview: vi.fn() }));

afterEach(() => vi.clearAllMocks());

function pendingPreview(overrides: Partial<InvitationPreview> = {}): InvitationPreview {
  return {
    status: "pending",
    requiresAuthentication: true,
    trip: { title: "Buenos Aires, 2026", destination: { cityName: "Buenos Aires" } },
    ownerDisplayName: "Camilo",
    invitedEmailMasked: "p•••••@mail.com",
    ...overrides,
  };
}

function setPreview(value: unknown) {
  (useInvitationPreview as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue(value);
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/invite/tok-1"]}>
        <Routes>
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="/trips/:tripId" element={<div>portada-del-viaje</div>} />
          <Route path="/login" element={<div>pantalla-login</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("InvitePage", () => {
  it("token inválido (404) → estado no encontrada", () => {
    setPreview({ isLoading: false, isError: true, error: new PlatformApiError("x", 404, "/"), data: undefined });
    useSession.mockReturnValue({ status: "unauthenticated", user: null });
    renderPage();
    expect(screen.getByText("No encontramos esta invitación.")).toBeInTheDocument();
  });

  it("invitación vencida → estado terminal honesto", () => {
    setPreview({ isLoading: false, isError: false, data: { invitation: pendingPreview({ status: "expired" }) } });
    useSession.mockReturnValue({ status: "unauthenticated", user: null });
    renderPage();
    expect(screen.getByText("Esta invitación venció.")).toBeInTheDocument();
  });

  it("sin sesión → guía al login sin ofrecer aceptar", () => {
    setPreview({ isLoading: false, isError: false, data: { invitation: pendingPreview() } });
    useSession.mockReturnValue({ status: "unauthenticated", user: null });
    renderPage();
    expect(screen.getByText(/Antes de aceptar, inicia sesión/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Iniciar sesión para continuar/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aceptar invitación/ })).not.toBeInTheDocument();
  });

  it("con sesión y correo distinto → estado 'otro correo', sin aceptar", () => {
    setPreview({ isLoading: false, isError: false, data: { invitation: pendingPreview() } });
    useSession.mockReturnValue({ status: "authenticated", user: { email: "otro@mail.com" } });
    renderPage();
    expect(screen.getByText("Esta invitación fue enviada a otro correo.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aceptar invitación/ })).not.toBeInTheDocument();
  });

  it("con sesión y correo coincidente → decisión; aceptar navega a la Portada", async () => {
    setPreview({ isLoading: false, isError: false, data: { invitation: pendingPreview() } });
    useSession.mockReturnValue({ status: "authenticated", user: { email: "pareja@mail.com" } });
    acceptInvitation.mockResolvedValue({ tripId: "trip-9" });

    renderPage();
    expect(screen.getByText("¿Quieres formar parte de esta historia?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Aceptar invitación/ }));

    expect(await screen.findByText("portada-del-viaje")).toBeInTheDocument();
    expect(acceptInvitation).toHaveBeenCalledWith("tok-1");
  });
});
