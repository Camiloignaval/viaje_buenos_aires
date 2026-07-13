import { useState } from "react";
import { whatsappShareUrl } from "../lib/whatsappUrl";

type CopyStatus = "idle" | "success" | "error";

// Compartir el enlace de una invitación ya creada: WhatsApp (wa.me, sin API
// oficial) y copiar al portapapeles.
export function ShareInvitation({ inviteUrl }: { inviteUrl: string }) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <div className="invite-share">
      <label>
        <span>Enlace de invitación</span>
        <input
          type="url"
          readOnly
          value={inviteUrl}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>

      <a
        className="invite-share-primary"
        href={whatsappShareUrl(inviteUrl)}
        target="_blank"
        rel="noreferrer"
      >
        Compartir por WhatsApp
      </a>
      <button type="button" onClick={onCopy}>
        {copyStatus === "success" ? "Enlace copiado ✓" : "Copiar enlace"}
      </button>

      <p role="status" aria-live="polite">
        {copyStatus === "success" && "Enlace copiado al portapapeles."}
        {copyStatus === "error" &&
          "No pudimos copiar el enlace. Selecciónalo y cópialo manualmente."}
      </p>
    </div>
  );
}
