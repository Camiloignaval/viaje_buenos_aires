import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { CreateTripWizard } from "./CreateTripWizard";

const searchCities = vi.fn();
vi.mock("../api/locationsApi", () => ({
  searchCities: (...args: unknown[]) => searchCities(...args),
}));
vi.mock("../hooks/useCreateTrip", () => ({
  useCreateTrip: () => ({ mutateAsync: vi.fn(), isError: false, error: null }),
}));

describe("CreateTripWizard · país y ciudad", () => {
  it("cambiar de país limpia la ciudad elegida y vuelve a bloquear Continuar", async () => {
    searchCities.mockResolvedValue({
      cities: [
        {
          id: "fallback:cl:valdivia",
          name: "Valdivia",
          adminName: "Región de Los Ríos",
          countryCode: "CL",
          countryName: "Chile",
          latitude: -39.8141,
          longitude: -73.246,
          timezone: "America/Santiago",
        },
      ],
    });
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CreateTripWizard onCancel={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText("Título"), "Viaje austral");
    await user.click(screen.getByRole("button", { name: "Continuar →" }));

    await user.type(screen.getByLabelText("País"), "Chile");
    await user.click(screen.getByRole("button", { name: "Chile" }));
    await user.click(screen.getByRole("button", { name: "Continuar →" }));

    await user.type(screen.getByLabelText("Ciudad"), "va");
    await user.click(await screen.findByRole("button", { name: "Valdivia, Región de Los Ríos" }));
    expect(screen.getByRole("button", { name: "Continuar →" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "← Volver" }));
    const country = screen.getByLabelText("País");
    await user.clear(country);
    await user.type(country, "Argentina");
    await user.click(screen.getByRole("button", { name: "Argentina" }));
    await user.click(screen.getByRole("button", { name: "Continuar →" }));

    expect(screen.getByLabelText("Ciudad")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Continuar →" })).toBeDisabled();
  });
});
