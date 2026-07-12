import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Trip } from "@/features/trips/types";
import { TripInvitePanel } from "./TripInvitePanel";

const { listTripInvitations, createInvitation, revokeInvitation } = vi.hoisted(() => ({
  listTripInvitations: vi.fn(),
  createInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
}));
vi.mock("../api/invitationsApi", () => ({ listTripInvitations, createInvitation, revokeInvitation }));

afterEach(() => vi.clearAllMocks());

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    title: "Buenos Aires, 2026",
    destination: "Buenos Aires",
    baseStoryId: "ba-2026",
    status: "active",
    role: "owner",
    updatedAt: "2026-07-01T00:00:00.000Z",
    members: [{ userId: "u1", role: "owner", joinedAt: "2026-07-01T00:00:00.000Z" }],
    expectedTravelers: 2,
    ...overrides,
  };
}

function renderPanel(t: Trip) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TripInvitePanel trip={t} />
    </QueryClientProvider>,
  );
}

describe("TripInvitePanel", () => {
  it("owner ve el CTA de invitar y abre el diálogo", async () => {
    listTripInvitations.mockResolvedValue({ invitations: [] });
    renderPanel(trip());

    const cta = await screen.findByRole("button", { name: /Invitar a esta historia/ });
    expect(cta).toBeEnabled();
    fireEvent.click(cta);
    expect(screen.getByText("¿Con quién quieres compartir esta historia?")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo de la persona")).toBeInTheDocument();
  });

  it("editor NO ve acciones de administración", () => {
    renderPanel(trip({ role: "editor" }));
    expect(screen.getByText("Compartís esta historia.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Invitar a esta historia/ })).not.toBeInTheDocument();
    expect(listTripInvitations).not.toHaveBeenCalled();
  });

  it("owner con cupo lleno ve el CTA deshabilitado", async () => {
    listTripInvitations.mockResolvedValue({ invitations: [] });
    renderPanel(
      trip({
        members: [
          { userId: "u1", role: "owner", joinedAt: "x" },
          { userId: "u2", role: "editor", joinedAt: "x" },
        ],
      }),
    );
    const cta = await screen.findByRole("button", { name: /Invitar a esta historia/ });
    expect(cta).toBeDisabled();
  });
});
