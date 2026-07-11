import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateTimeFields } from "./DateTimeFields";

describe("DateTimeFields", () => {
  it("separa fecha y hora en dos campos, cada uno con su propio label", () => {
    render(
      <DateTimeFields idPrefix="test" dateLabel="Fecha" timeLabel="Hora" value="2026-07-18T09:30" onChange={() => {}} />,
    );
    expect(screen.getByLabelText("Fecha")).toHaveValue("2026-07-18");
    expect(screen.getByLabelText("Hora")).toHaveValue("09:30");
  });

  it("no emite un valor combinado hasta que ambos campos están completos", () => {
    const onChange = vi.fn();
    render(<DateTimeFields idPrefix="test" dateLabel="Fecha" timeLabel="Hora" value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2026-07-18" } });
    expect(onChange).toHaveBeenLastCalledWith("");

    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "09:30" } });
    expect(onChange).toHaveBeenLastCalledWith("2026-07-18T09:30");
  });

  it("combina correctamente sin importar el orden en que se completan los campos", () => {
    const onChange = vi.fn();
    render(<DateTimeFields idPrefix="test" dateLabel="Fecha" timeLabel="Hora" value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "22:00" } });
    expect(onChange).toHaveBeenLastCalledWith("");

    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2026-07-21" } });
    expect(onChange).toHaveBeenLastCalledWith("2026-07-21T22:00");
  });

  it("al volver a este paso, conserva los valores ya elegidos (resincroniza desde el prop value)", () => {
    const { rerender } = render(
      <DateTimeFields idPrefix="test" dateLabel="Fecha" timeLabel="Hora" value="" onChange={() => {}} />,
    );
    rerender(
      <DateTimeFields
        idPrefix="test"
        dateLabel="Fecha"
        timeLabel="Hora"
        value="2026-07-18T09:30"
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("Fecha")).toHaveValue("2026-07-18");
    expect(screen.getByLabelText("Hora")).toHaveValue("09:30");
  });

  it("respeta el mínimo de fecha cuando se indica", () => {
    render(
      <DateTimeFields
        idPrefix="test"
        dateLabel="Fecha"
        timeLabel="Hora"
        value=""
        onChange={() => {}}
        min="2026-07-18"
      />,
    );
    expect(screen.getByLabelText("Fecha")).toHaveAttribute("min", "2026-07-18");
  });
});
