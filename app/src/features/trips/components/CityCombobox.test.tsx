import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CityCombobox } from "./CityCombobox";
import type { CityOption } from "../types";

const searchCities = vi.fn();
vi.mock("../api/locationsApi", () => ({
  searchCities: (...args: unknown[]) => searchCities(...args),
}));

const VALDIVIA: CityOption = {
  id: "915341",
  name: "Valdivia",
  adminName: "Región de Los Ríos",
  countryCode: "CL",
  countryName: "Chile",
  latitude: -39.8141,
  longitude: -73.246,
  timezone: "America/Santiago",
};

const VALPARAISO: CityOption = {
  id: "valparaiso",
  name: "Valparaíso",
  adminName: "Región de Valparaíso",
  countryCode: "CL",
  countryName: "Chile",
  latitude: -33.0472,
  longitude: -71.6127,
  timezone: "America/Santiago",
};

function renderCombobox({
  countryCode = "AR",
  value = null,
  onChange = () => {},
}: {
  countryCode?: string;
  value?: CityOption | null;
  onChange?: (city: CityOption | null) => void;
} = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CityCombobox label="Ciudad" countryCode={countryCode} value={value} onChange={onChange} />
    </QueryClientProvider>,
  );
}

describe("CityCombobox", () => {
  beforeEach(() => {
    searchCities.mockReset();
  });

  it("con 0 caracteres invita a escribir una ciudad sin consultar", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.click(screen.getByLabelText("Ciudad"));

    expect(screen.getByText("Escribe una ciudad.")).toBeInTheDocument();
    expect(searchCities).not.toHaveBeenCalled();
  });

  it("con 1 carácter pide otra letra y no muestra loading ni sin resultados", async () => {
    const user = userEvent.setup();
    renderCombobox();

    await user.type(screen.getByLabelText("Ciudad"), "v");

    expect(screen.getByText("Escribe al menos 2 letras.")).toBeInTheDocument();
    expect(screen.queryByText("Buscando…")).not.toBeInTheDocument();
    expect(screen.queryByText("No encontramos una ciudad con ese nombre.")).not.toBeInTheDocument();
    expect(searchCities).not.toHaveBeenCalled();
  });

  it("con 2 caracteres consulta después del debounce", async () => {
    searchCities.mockResolvedValue({ cities: [] });
    const user = userEvent.setup();
    renderCombobox({ countryCode: "CL" });

    await user.type(screen.getByLabelText("Ciudad"), "va");

    expect(await screen.findByText("No encontramos una ciudad con ese nombre.")).toBeInTheDocument();
    expect(searchCities).toHaveBeenCalledWith("CL", "va", expect.any(AbortSignal));
  });

  it("mientras el debounce o request están pendientes muestra Buscando, nunca sin resultados", async () => {
    searchCities.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderCombobox();

    await user.type(screen.getByLabelText("Ciudad"), "va");

    expect(screen.getByText("Buscando…")).toBeInTheDocument();
    expect(screen.queryByText("No encontramos una ciudad con ese nombre.")).not.toBeInTheDocument();
  });

  it("va con Chile muestra Valdivia y prioriza nombres que comienzan por el prefijo", async () => {
    const naval = { ...VALDIVIA, id: "naval", name: "Naval" };
    searchCities.mockResolvedValue({ cities: [VALDIVIA, VALPARAISO, naval] });
    const user = userEvent.setup();
    renderCombobox({ countryCode: "CL" });

    await user.type(screen.getByLabelText("Ciudad"), "va");

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Valdivia, Región de Los Ríos",
      "Valparaíso, Región de Valparaíso",
      "Naval, Región de Los Ríos",
    ]);
  });

  it("permite seleccionar Valdivia con teclado y conserva ARIA de combobox", async () => {
    searchCities.mockResolvedValue({ cities: [VALDIVIA, VALPARAISO] });
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderCombobox({ countryCode: "CL", onChange });
    const input = screen.getByRole("combobox", { name: "Ciudad" });

    await user.type(input, "va");
    await screen.findByRole("option", { name: "Valdivia, Región de Los Ríos" });
    expect(input).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith(VALDIVIA);
    expect(input).toHaveValue("Valdivia");
  });

  it("un error del proveedor muestra un estado recuperable, no sin resultados", async () => {
    searchCities.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    renderCombobox({ countryCode: "CL" });

    await user.type(screen.getByLabelText("Ciudad"), "va");

    expect(await screen.findByText("No pudimos buscar ahora. Inténtalo nuevamente.")).toBeInTheDocument();
    expect(screen.queryByText("No encontramos una ciudad con ese nombre.")).not.toBeInTheDocument();
  });

  it("editar una ciudad seleccionada limpia la selección y vuelve a exigir una opción válida", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderCombobox({ countryCode: "CL", value: VALDIVIA, onChange });
    const input = screen.getByLabelText("Ciudad");

    await user.clear(input);
    await user.type(input, "va");

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
