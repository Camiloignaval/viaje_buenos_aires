import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { CityCombobox } from "./CityCombobox";

const searchCities = vi.fn();
vi.mock("../api/locationsApi", () => ({
  searchCities: (...args: unknown[]) => searchCities(...args),
}));

function renderCombobox() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CityCombobox label="Ciudad" countryCode="AR" value={null} onChange={() => {}} />
    </QueryClientProvider>,
  );
}

describe("CityCombobox", () => {
  beforeEach(() => {
    searchCities.mockReset();
  });

  it("mientras el debounce no asienta la búsqueda muestra 'Buscando…', nunca 'sin resultados' prematuro", async () => {
    searchCities.mockResolvedValue({ cities: [] });
    const user = userEvent.setup();
    renderCombobox();

    await user.type(screen.getByLabelText("Ciudad"), "rio");

    expect(screen.getByText("Buscando…")).toBeInTheDocument();
    expect(screen.queryByText("No encontramos una ciudad con ese nombre.")).not.toBeInTheDocument();
  });

  it("recién muestra 'No encontramos una ciudad con ese nombre.' cuando la búsqueda realmente terminó", async () => {
    searchCities.mockResolvedValue({ cities: [] });
    const user = userEvent.setup();
    renderCombobox();

    await user.type(screen.getByLabelText("Ciudad"), "rio");

    expect(
      await screen.findByText("No encontramos una ciudad con ese nombre.", undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("pide al menos 2 letras antes de buscar", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.type(screen.getByLabelText("Ciudad"), "r");

    expect(await screen.findByText("Escribe al menos 2 letras.", undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(searchCities).not.toHaveBeenCalled();
  });
});
