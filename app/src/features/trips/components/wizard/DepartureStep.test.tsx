import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DepartureStep } from "./DepartureStep";

describe("DepartureStep", () => {
  it("pregunta '¿Cuándo vuelven?' con fecha y hora separadas", () => {
    render(
      <DepartureStep
        value=""
        minDateTime="2026-07-18T09:30"
        cityName="Buenos Aires"
        onChange={() => {}}
        onBack={() => {}}
        onNext={() => {}}
        canAdvance={false}
      />,
    );
    expect(screen.getByRole("heading", { name: "¿Cuándo vuelven?" })).toBeInTheDocument();
  });

  it("el mínimo del selector de fecha es el DÍA de la llegada (permite elegir el mismo día)", () => {
    render(
      <DepartureStep
        value=""
        minDateTime="2026-07-18T09:30"
        cityName="Buenos Aires"
        onChange={() => {}}
        onBack={() => {}}
        onNext={() => {}}
        canAdvance={false}
      />,
    );
    expect(screen.getByLabelText("Fecha")).toHaveAttribute("min", "2026-07-18");
  });

  it("muestra un mensaje humano si el regreso no es posterior a la llegada", () => {
    render(
      <DepartureStep
        value="2026-07-18T08:00"
        minDateTime="2026-07-18T09:30"
        cityName="Buenos Aires"
        onChange={() => {}}
        onBack={() => {}}
        onNext={() => {}}
        canAdvance={false}
      />,
    );
    expect(screen.getByText("La vuelta debe ser después de la llegada.")).toBeInTheDocument();
  });

  it("permite el mismo día si la hora de regreso es posterior (sin error)", () => {
    render(
      <DepartureStep
        value="2026-07-18T21:00"
        minDateTime="2026-07-18T09:30"
        cityName="Buenos Aires"
        onChange={() => {}}
        onBack={() => {}}
        onNext={() => {}}
        canAdvance
      />,
    );
    expect(screen.queryByText("La vuelta debe ser después de la llegada.")).not.toBeInTheDocument();
  });

  it("no muestra error mientras no se eligió ninguna fecha todavía", () => {
    render(
      <DepartureStep
        value=""
        minDateTime="2026-07-18T09:30"
        cityName="Buenos Aires"
        onChange={() => {}}
        onBack={() => {}}
        onNext={() => {}}
        canAdvance={false}
      />,
    );
    expect(screen.queryByText("La vuelta debe ser después de la llegada.")).not.toBeInTheDocument();
  });
});
