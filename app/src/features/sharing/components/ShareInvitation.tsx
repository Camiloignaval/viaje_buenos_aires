import { useState } from "react";
import { whatsappShareUrl } from "../lib/whatsappUrl";

// Compartir el enlace de una invitación ya creada: WhatsApp (wa.me, sin API
// oficial) y copiar al portapapeles.
export function ShareInvitation({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      // Si el portapapeles no está disponible, el enlace igual se ve en pantalla.
    }
  };

  return (
    <div className="invite-share">
      <a
        className="invite-share-primary"
        href={whatsappShareUrl(inviteUrl)}
        target="_blank"
        rel="noreferrer"
      >
        Compartir por WhatsApp
      </a>
      <button type="button" onClick={onCopy}>
        {copied ? "Enlace copiado ✓" : "Copiar enlace"}
      </button>
    </div>
  );
}
