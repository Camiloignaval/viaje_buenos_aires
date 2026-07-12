import { describe, expect, it } from "vitest";
import { whatsappShareText, whatsappShareUrl } from "./whatsappUrl";

describe("whatsappShareUrl", () => {
  it("arma un wa.me con el inviteUrl codificado y el copy de Alaia", () => {
    const inviteUrl = "https://alaia.cl/invite/abc123";
    const url = whatsappShareUrl(inviteUrl);
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain(inviteUrl);
    expect(decodeURIComponent(url)).toContain("Alaia");
    expect(whatsappShareText(inviteUrl)).toContain("inicia sesión con el correo");
  });
});
