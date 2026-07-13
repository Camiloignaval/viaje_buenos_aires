import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateInvitationDialog } from "./CreateInvitationDialog";

const { createInvitation } = vi.hoisted(() => ({ createInvitation: vi.fn() }));
vi.mock("../api/invitationsApi", () => ({ createInvitation, revokeInvitation: vi.fn(), listTripInvitations: vi.fn() }));

afterEach(() => vi.clearAllMocks());

function renderDialog(onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateInvitationDialog tripId="trip-1" onClose={onClose} />
    </QueryClientProvider>,
  );
}

describe("CreateInvitationDialog", () => {
  it("crea la invitación y ofrece compartir el enlace", async () => {
    createInvitation.mockResolvedValue({
      invitationId: "inv-1",
      inviteUrl: "https://alaia.cl/invite/tok",
      expiresAt: "2026-12-01T00:00:00.000Z",
    });

    renderDialog();
    fireEvent.change(screen.getByLabelText("Correo de la persona"), { target: { value: "pareja@mail.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear invitación" }));

    expect(await screen.findByRole("link", { name: "Compartir por WhatsApp" })).toBeInTheDocument();
    expect(createInvitation).toHaveBeenCalledWith("trip-1", "pareja@mail.com");
  });

  it("presenta el regreso como acción editorial secundaria", () => {
    const onClose = vi.fn();
    renderDialog(onClose);

    const back = screen.getByRole("button", { name: "← Volver a la portada" });
    expect(back).toHaveClass("invite-dialog-back");
    fireEvent.click(back);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
