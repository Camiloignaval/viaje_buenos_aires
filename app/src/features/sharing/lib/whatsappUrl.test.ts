import { describe, expect, it } from "vitest";
import { whatsappShareText, whatsappShareUrl } from "./whatsappUrl";

const inviteUrl = "https://alaia.cl/invite/abc123?source=dueña&next=%2Ftrips";
const expectedMessage = `Te invito a compartir nuestra historia en Alaia.\n\nEsta invitación corresponde al correo al que fue enviada. Primero inicia sesión con ese correo y luego acepta la invitación aquí:\n\n${inviteUrl}`;

describe("whatsappShareUrl", () => {
  it("genera el mensaje exacto en español chileno con la URL absoluta detectable", () => {
    expect(whatsappShareText(inviteUrl)).toBe(expectedMessage);
    expect(whatsappShareText(inviteUrl).endsWith(inviteUrl)).toBe(true);
  });

  it("codifica el mensaje completo como el parámetro text de wa.me", () => {
    const shareUrl = whatsappShareUrl(inviteUrl);

    expect(shareUrl).toBe(
      `https://wa.me/?text=${encodeURIComponent(expectedMessage)}`,
    );

    const parsedUrl = new URL(shareUrl);
    expect(parsedUrl.origin).toBe("https://wa.me");
    expect(parsedUrl.pathname).toBe("/");
    expect(parsedUrl.searchParams.get("text")).toBe(expectedMessage);
  });
});
