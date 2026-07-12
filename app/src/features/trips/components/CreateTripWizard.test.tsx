import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Verifica el contrato de navegación post-creación: tras crear el viaje, el
// wizard navega por SPA a la Portada del viaje (/trips/:id) — NUNCA vuelve a la
// lista general. Se mockean las piezas pesadas para llegar al éxito de forma
// determinista, ejercitando el handleStorySuccess real del wizard.
const navigate = vi.hoisted(() => vi.fn());
const mutateAsync = vi.hoisted(() =>
  vi.fn(async () => ({
    trip: {
      id: "new-1",
      title: "Nuevo viaje",
      destination: "Buenos Aires",
      baseStoryId: "ba-2026",
      status: "active",
      role: "owner",
      updatedAt: "2026-07-11T00:00:00.000Z",
    },
  })),
);

vi.mock("react-router-dom", async (orig) => ({
  ...(await orig<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));
vi.mock("../hooks/useCreateTrip", () => ({
  useCreateTrip: () => ({ mutateAsync, isError: false, error: null }),
}));
// Arranca directo en el resumen (único paso) para no recorrer los 13 pasos.
vi.mock("./wizard/wizardData", async (orig) => ({
  ...(await orig<typeof import("./wizard/wizardData")>()),
  WIZARD_STEPS: ["summary"],
  buildCreateTripInput: () => ({}),
}));
vi.mock("./wizard/SummaryStep", () => ({
  SummaryStep: ({ onBegin }: { onBegin: () => void }) => (
    <button type="button" onClick={onBegin}>
      comenzar-historia
    </button>
  ),
}));
vi.mock("./wizard/StoryBeginning", () => ({
  StoryBeginning: ({ run, onSuccess }: { run: () => Promise<unknown>; onSuccess: (t: unknown) => void }) => (
    <button type="button" onClick={() => void run().then(onSuccess)}>
      exito
    </button>
  ),
}));

import { CreateTripWizard } from "./CreateTripWizard";

afterEach(() => vi.clearAllMocks());

describe("CreateTripWizard — navegación post-creación", () => {
  it("tras crear el viaje navega SPA a la Portada /trips/:id, no a la lista general", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CreateTripWizard onCancel={() => {}} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "comenzar-historia" }));
    await user.click(screen.getByRole("button", { name: "exito" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/trips/new-1"));
    // Nunca a la lista general.
    expect(navigate).not.toHaveBeenCalledWith("/trips");
  });
});
