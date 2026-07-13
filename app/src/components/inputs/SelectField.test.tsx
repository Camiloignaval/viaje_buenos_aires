import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SelectField } from "./SelectField";

const OPTIONS = [
  { value: "suggestion", label: "Sugerencia" },
  { value: "problem", label: "Problema" },
  { value: "question", label: "Consulta" },
] as const;

describe("SelectField", () => {
  it("expone un combobox etiquetado y selecciona una opción con puntero", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectField label="Categoría" value="suggestion" options={OPTIONS} onChange={onChange} />,
    );

    await user.click(screen.getByRole("combobox", { name: "Categoría" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Problema" }));

    expect(onChange).toHaveBeenCalledWith("problem");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("permite recorrer y elegir opciones con teclado", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectField label="Categoría" value="suggestion" options={OPTIONS} onChange={onChange} />,
    );

    const trigger = screen.getByRole("combobox", { name: "Categoría" });
    trigger.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("problem");
  });

  it("cierra el panel con Escape sin cambiar el valor", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectField label="Categoría" value="suggestion" options={OPTIONS} onChange={onChange} />,
    );

    const trigger = screen.getByRole("combobox", { name: "Categoría" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
