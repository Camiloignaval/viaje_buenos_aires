import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ShareInvitation } from "./ShareInvitation";

afterEach(() => vi.restoreAllMocks());

describe("ShareInvitation", () => {
  it("arma el enlace de WhatsApp con el inviteUrl", () => {
    render(<ShareInvitation inviteUrl="https://alaia.cl/invite/abc" />);
    const link = screen.getByRole("link", { name: "Compartir por WhatsApp" });
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(href)).toContain("https://alaia.cl/invite/abc");
  });

  it("copia el enlace al portapapeles", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ShareInvitation inviteUrl="https://alaia.cl/invite/abc" />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://alaia.cl/invite/abc"));
    expect(await screen.findByText("Enlace copiado ✓")).toBeInTheDocument();
  });
});
