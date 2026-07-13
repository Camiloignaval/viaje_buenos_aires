import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DepartureStep } from "./DepartureStep";

const noop = () => {};

function renderDeparture(value = "", minDateTime = "2026-07-18T09:30") {
  return render(
    <DepartureStep
      value={value}
      minDateTime={minDateTime}
      cityName="Buenos Aires"
      onChange={noop}
      onBack={noop}
      onNext={noop}
      canAdvance={Boolean(value && value > minDateTime)}
    />,
  );
}

describe("DepartureStep", () => {
  it("pregunta cuándo vuelven con selectores editoriales", () => {
    renderDeparture();
    expect(screen.getByRole("heading", { name: "¿Cuándo vuelven?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir fecha →" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir hora →" })).toBeInTheDocument();
  });

  it("el mínimo es el día de llegada y permite elegir ese mismo día", async () => {
    const user = userEvent.setup();
    renderDeparture();
    await user.click(screen.getByRole("button", { name: "Elegir fecha →" }));
    expect(screen.getByRole("gridcell", { name: "Viernes, 17 de julio de 2026" })).toBeDisabled();
    expect(screen.getByRole("gridcell", { name: "Sábado, 18 de julio de 2026" })).toBeEnabled();
  });

  it("muestra un mensaje humano si el regreso no es posterior a la llegada", () => {
    renderDeparture("2026-07-18T08:00");
    expect(screen.getByText("La vuelta debe ser después de la llegada.")).toBeInTheDocument();
  });

  it("permite el mismo día si la hora de regreso es posterior", () => {
    renderDeparture("2026-07-18T21:00");
    expect(screen.queryByText("La vuelta debe ser después de la llegada.")).not.toBeInTheDocument();
  });

  it("no muestra error mientras todavía no se eligió fecha y hora", () => {
    renderDeparture();
    expect(screen.queryByText("La vuelta debe ser después de la llegada.")).not.toBeInTheDocument();
  });

  it("muestra ayuda contextual cuando el regreso es temprano", () => {
    renderDeparture("2026-07-18T08:00", "2026-07-17T09:30");
    expect(screen.getByText(/último día será breve/)).toBeInTheDocument();
  });
});
