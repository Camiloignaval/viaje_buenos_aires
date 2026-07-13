import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArrivalStep } from "./ArrivalStep";

const noop = () => {};

describe("ArrivalStep", () => {
  it("pregunta cuándo llegan con fecha y hora en bloques separados", () => {
    render(
      <ArrivalStep value="" cityName="Buenos Aires" onChange={noop} onBack={noop} onNext={noop} canAdvance={false} />,
    );
    expect(screen.getByRole("heading", { name: "¿Cuándo llegan?" })).toBeInTheDocument();
    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Hora")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir fecha →" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir hora →" })).toBeInTheDocument();
  });

  it("muestra el timezone del destino de forma discreta", () => {
    render(
      <ArrivalStep value="" cityName="Buenos Aires" onChange={noop} onBack={noop} onNext={noop} canAdvance={false} />,
    );
    expect(screen.getByText("Hora de Buenos Aires")).toBeInTheDocument();
  });

  it("no muestra ninguna pista de timezone si todavía no hay ciudad elegida", () => {
    render(<ArrivalStep value="" cityName={null} onChange={noop} onBack={noop} onNext={noop} canAdvance={false} />);
    expect(screen.queryByText(/^Hora de/)).not.toBeInTheDocument();
  });

  it("propaga el valor combinado de fecha+hora hacia arriba", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ArrivalStep value="2026-07-18T09:30" cityName="Buenos Aires" onChange={onChange} onBack={noop} onNext={noop} canAdvance />,
    );
    await user.click(screen.getByRole("button", { name: "Cambiar hora →" }));
    await user.click(screen.getByRole("button", { name: "12:00" }));
    await user.click(screen.getByRole("button", { name: "Usar esta hora" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-07-18T12:00");
  });

  it("muestra ayuda contextual sólo cuando la llegada es tarde", () => {
    const { rerender } = render(
      <ArrivalStep value="2026-07-18T09:30" cityName="Valdivia" onChange={noop} onBack={noop} onNext={noop} canAdvance />,
    );
    expect(screen.queryByText(/primer día/)).not.toBeInTheDocument();
    rerender(
      <ArrivalStep value="2026-07-18T22:00" cityName="Valdivia" onChange={noop} onBack={noop} onNext={noop} canAdvance />,
    );
    expect(screen.getByText(/primer día será principalmente de descanso/)).toBeInTheDocument();
  });
});
