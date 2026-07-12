import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArrivalStep } from "./ArrivalStep";

describe("ArrivalStep", () => {
  it("pregunta '¿Cuándo llegan?' con fecha y hora separadas", () => {
    render(
      <ArrivalStep value="" cityName="Buenos Aires" onChange={() => {}} onBack={() => {}} onNext={() => {}} canAdvance={false} />,
    );
    expect(screen.getByRole("heading", { name: "¿Cuándo llegan?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora")).toBeInTheDocument();
  });

  it("muestra el timezone del destino de forma discreta", () => {
    render(
      <ArrivalStep value="" cityName="Buenos Aires" onChange={() => {}} onBack={() => {}} onNext={() => {}} canAdvance={false} />,
    );
    expect(screen.getByText("Hora de Buenos Aires")).toBeInTheDocument();
  });

  it("no muestra ninguna pista de timezone si todavía no hay ciudad elegida", () => {
    render(<ArrivalStep value="" cityName={null} onChange={() => {}} onBack={() => {}} onNext={() => {}} canAdvance={false} />);
    expect(screen.queryByText(/^Hora de/)).not.toBeInTheDocument();
  });

  it("propaga el valor combinado de fecha+hora hacia arriba", () => {
    const onChange = vi.fn();
    render(
      <ArrivalStep value="" cityName="Buenos Aires" onChange={onChange} onBack={() => {}} onNext={() => {}} canAdvance={false} />,
    );
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2026-07-18" } });
    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "09:30" } });
    expect(onChange).toHaveBeenLastCalledWith("2026-07-18T09:30");
  });
});
