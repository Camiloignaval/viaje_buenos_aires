import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailStep } from "./EmailStep";

// Ejercita la integración real RHF + zodResolver + Zod 4 en runtime (no solo
// el schema): que valide, muestre el mensaje original y normalice al enviar.
describe("EmailStep", () => {
  it("muestra la copy editorial de Aurora", () => {
    render(
      <EmailStep defaultEmail="" submitting={false} submitError={null} onSubmit={() => {}} />,
    );
    expect(
      screen.getByRole("heading", { name: "Tus viajes empiezan acá." }),
    ).toBeInTheDocument();
  });

  it("valida el correo vacío con el mensaje original y no envía", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <EmailStep defaultEmail="" submitting={false} submitError={null} onSubmit={onSubmit} />,
    );
    await user.click(screen.getByRole("button", { name: "Continuar →" }));
    expect(await screen.findByText("Ingresa tu correo.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("normaliza (trim) el correo antes de enviarlo", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <EmailStep defaultEmail="" submitting={false} submitError={null} onSubmit={onSubmit} />,
    );
    await user.type(screen.getByLabelText("Tu correo"), "  kari@example.com  ");
    await user.click(screen.getByRole("button", { name: "Continuar →" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith("kari@example.com"),
    );
  });
});
