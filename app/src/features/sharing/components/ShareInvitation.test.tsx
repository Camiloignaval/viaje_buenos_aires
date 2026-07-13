import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ShareInvitation } from "./ShareInvitation";
import { whatsappShareText } from "../lib/whatsappUrl";

const inviteUrl = "https://alaia.cl/invite/abc?source=whatsapp&next=%2Ftrips";

afterEach(() => vi.restoreAllMocks());

describe("ShareInvitation", () => {
  it("muestra siempre el enlace seleccionable y arma el mensaje de WhatsApp", () => {
    render(<ShareInvitation inviteUrl={inviteUrl} />);

    const visibleUrl = screen.getByRole("textbox", {
      name: "Enlace de invitación",
    });
    expect(visibleUrl).toHaveValue(inviteUrl);
    expect(visibleUrl).toHaveAttribute("readonly");

    fireEvent.focus(visibleUrl);
    expect((visibleUrl as HTMLInputElement).selectionStart).toBe(0);
    expect((visibleUrl as HTMLInputElement).selectionEnd).toBe(inviteUrl.length);

    const whatsappLink = screen.getByRole("link", {
      name: "Compartir por WhatsApp",
    });
    const shareUrl = new URL(whatsappLink.getAttribute("href") ?? "");
    expect(shareUrl.searchParams.get("text")).toBe(
      whatsappShareText(inviteUrl),
    );
  });

  it("copia el enlace y anuncia el éxito", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ShareInvitation inviteUrl={inviteUrl} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(inviteUrl));
    expect(
      await screen.findByText("Enlace copiado al portapapeles."),
    ).toHaveAttribute("role", "status");
    expect(
      screen.getByRole("button", { name: "Enlace copiado ✓" }),
    ).toBeInTheDocument();
  });

  it("mantiene el enlace visible y anuncia el error si falla el portapapeles", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ShareInvitation inviteUrl={inviteUrl} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));

    expect(
      await screen.findByText(
        "No pudimos copiar el enlace. Selecciónalo y cópialo manualmente.",
      ),
    ).toHaveAttribute("role", "status");
    expect(writeText).toHaveBeenCalledWith(inviteUrl);
    expect(
      screen.getByRole("textbox", { name: "Enlace de invitación" }),
    ).toHaveValue(inviteUrl);
  });
});
