import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateTimeFields } from "./DateTimeFields";

const BASE_PROPS = {
  idPrefix: "test",
  dateLabel: "Fecha",
  timeLabel: "Hora",
  cityName: "Valdivia",
  timeZone: "America/Santiago",
};

describe("DateTimeFields editorial", () => {
  it("muestra fecha humana, hora 24 h y timezone sin inputs nativos", () => {
    const { container } = render(
      <DateTimeFields {...BASE_PROPS} value="2026-07-18T09:30" onChange={() => {}} />,
    );

    expect(screen.getByText("Sábado, 18 de julio de 2026")).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.getByText("Hora de Valdivia")).toBeInTheDocument();
    expect(container.querySelector('input[type="date"], input[type="time"], input[type="datetime-local"]')).toBeNull();
  });

  it("confirma fecha y hora por separado, pero conserva el contrato YYYY-MM-DDTHH:mm", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateTimeFields
        {...BASE_PROPS}
        value=""
        min="2030-07-18"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Elegir fecha →" }));
    await user.click(screen.getByRole("gridcell", { name: "Jueves, 18 de julio de 2030" }));
    await user.click(screen.getByRole("button", { name: "Elegir esta fecha" }));
    expect(onChange).toHaveBeenLastCalledWith("");

    await user.click(screen.getByRole("button", { name: "Elegir hora →" }));
    await user.click(screen.getByRole("button", { name: "12:00" }));
    await user.click(screen.getByRole("button", { name: "Usar esta hora" }));
    expect(onChange).toHaveBeenLastCalledWith("2030-07-18T12:00");
  });

  it("cancelar el calendario no modifica el valor", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateTimeFields {...BASE_PROPS} value="2026-07-18T09:30" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Cambiar fecha →" }));
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await user.click(screen.getByRole("gridcell", { name: "Sábado, 22 de agosto de 2026" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Sábado, 18 de julio de 2026")).toBeInTheDocument();
  });

  it("cancelar el selector de hora conserva la hora anterior", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateTimeFields {...BASE_PROPS} value="2026-07-18T09:30" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Cambiar hora →" }));
    await user.click(screen.getByRole("button", { name: "22:00" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("09:30")).toBeInTheDocument();
  });

  it("navega meses, muestra el mes correcto y confirma otra fecha", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateTimeFields {...BASE_PROPS} value="2026-07-18T09:30" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Cambiar fecha →" }));
    expect(screen.getByText("Julio de 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("Agosto de 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    await user.click(screen.getByRole("gridcell", { name: "Lunes, 20 de julio de 2026" }));
    await user.click(screen.getByRole("button", { name: "Elegir esta fecha" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-07-20T09:30");
  });

  it("deshabilita fechas anteriores al mínimo", async () => {
    const user = userEvent.setup();
    render(
      <DateTimeFields {...BASE_PROPS} value="2026-07-18T09:30" min="2026-07-18" onChange={() => {}} />,
    );
    await user.click(screen.getByRole("button", { name: "Cambiar fecha →" }));
    expect(screen.getByRole("gridcell", { name: /Viernes, 17 de julio de 2026(?:, hoy)?/ })).toBeDisabled();
    expect(screen.getByRole("gridcell", { name: "Sábado, 18 de julio de 2026" })).toBeEnabled();
  });

  it("Escape cierra el diálogo y devuelve el foco al disparador", async () => {
    const user = userEvent.setup();
    render(<DateTimeFields {...BASE_PROPS} value="2026-07-18T09:30" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Cambiar fecha →" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Elegí la fecha" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("gridcell", { name: "Sábado, 18 de julio de 2026" })).toHaveFocus());
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Elegí la fecha" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("click fuera cierra y Tab queda contenido dentro del diálogo", async () => {
    const user = userEvent.setup();
    render(<DateTimeFields {...BASE_PROPS} value="2026-07-18T09:30" onChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Cambiar hora →" }));

    const close = screen.getByRole("button", { name: "Cerrar selector" });
    const confirm = screen.getByRole("button", { name: "Usar esta hora" });
    await waitFor(() => expect(screen.getByRole("option", { name: "09" })).toHaveFocus());
    confirm.focus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();

    const overlay = document.querySelector<HTMLElement>(".alaia-picker-overlay");
    expect(overlay).not.toBeNull();
    fireEvent.mouseDown(overlay!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("permite elegir hora y minutos con teclado", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateTimeFields {...BASE_PROPS} value="2026-07-18T09:30" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Cambiar hora →" }));

    const hours = screen.getByRole("listbox", { name: "Hora" });
    const selectedHour = within(hours).getByRole("option", { name: "09" });
    selectedHour.focus();
    await user.keyboard("{ArrowDown}");
    const minutes = screen.getByRole("listbox", { name: "Minutos" });
    await user.click(within(minutes).getByRole("option", { name: "45" }));
    await user.click(screen.getByRole("button", { name: "Usar esta hora" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-07-18T10:45");
  });

  it("al volver al paso resincroniza los valores elegidos desde el prop", () => {
    const { rerender } = render(<DateTimeFields {...BASE_PROPS} value="" onChange={() => {}} />);
    rerender(<DateTimeFields {...BASE_PROPS} value="2026-07-18T09:30" onChange={() => {}} />);
    expect(screen.getByText("Sábado, 18 de julio de 2026")).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
  });

  it("una fecha local inválida no rompe ni se muestra como válida", () => {
    render(<DateTimeFields {...BASE_PROPS} value="2026-02-31T28:75" onChange={() => {}} />);
    expect(screen.getByText("Elegí una fecha")).toBeInTheDocument();
    expect(screen.getByText("Elegí una hora")).toBeInTheDocument();
  });
});
