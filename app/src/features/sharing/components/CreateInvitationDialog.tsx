import { useState } from "react";
import { PlatformApiError } from "@/services/platformClient";
import { useCreateInvitation } from "../hooks/useInvitationMutations";
import { ShareInvitation } from "./ShareInvitation";

// Crear una invitación por email y, al lograrlo, ofrecer el enlace para compartir.
// El inviteUrl solo llega en la respuesta de creación (nunca se re-consulta).
export function CreateInvitationDialog({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const create = useCreateInvitation(tripId);
  const result = create.data;
  const error = create.error instanceof PlatformApiError ? create.error.message : null;

  if (result) {
    return (
      <div className="invite-dialog" role="dialog" aria-label="Invitación creada">
        <p className="invite-dialog-text">Listo. Comparte este enlace con la persona que invitaste.</p>
        <ShareInvitation inviteUrl={result.inviteUrl} />
        <button type="button" className="invite-dialog-back" onClick={onClose}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <form
      className="invite-dialog"
      aria-label="Invitar a esta historia"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate(email.trim());
      }}
    >
      <h2 className="invite-dialog-title">¿Con quién quieres compartir esta historia?</h2>
      <label className="invite-dialog-label" htmlFor="invite-email">
        Correo de la persona
      </label>
      <input
        id="invite-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="correo@ejemplo.com"
        required
      />
      {error ? (
        <p className="invite-dialog-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="invite-dialog-actions">
        <button type="submit" disabled={create.isPending || !email.trim()}>
          Crear invitación
        </button>
        <button type="button" className="invite-dialog-back" onClick={onClose}>
          Volver
        </button>
      </div>
    </form>
  );
}
