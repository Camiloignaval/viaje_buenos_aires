import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlatformApiError } from "@/services/platformClient";
import { inviteCopy } from "../copy";
import { InviteFrame } from "./InviteFrame";
import { InviteStatusScreen } from "./InviteStatusScreen";
import { InviteWrongEmail } from "./InviteWrongEmail";
import { useAcceptInvitation, useDeclineInvitation } from "../hooks/useInvitationActions";
import type { InvitationPreview } from "../types";
import { isStandaloneDisplay } from "@/features/pwa/continuity";

// Con sesión y correo (aparentemente) coincidente: la decisión voluntaria.
// Aceptar → navega a la Portada del viaje (nunca directo a Experience).
// Rechazar → estado "rechazada". Un 403 del server (correo distinto) cae al
// estado honesto de otro correo.
export function InviteDecision({ token, invitation }: { token: string; invitation: InvitationPreview }) {
  const navigate = useNavigate();
  const accept = useAcceptInvitation(token);
  const decline = useDeclineInvitation(token);
  const [declined, setDeclined] = useState(false);
  const [acceptedTripId, setAcceptedTripId] = useState<string | null>(null);

  if (declined) return <InviteStatusScreen variant="declined" />;
  if (acceptedTripId) {
    const standalone = isStandaloneDisplay();
    return (
      <InviteFrame title="Esta historia ya forma parte de tus viajes.">
        <p className="alaia-entrance-text">
          {standalone
            ? "Puedes continuar esta historia desde Alaia."
            : "Si tienes Alaia en tu pantalla de inicio, ábrela para continuar."}
        </p>
        {!standalone && (
          <p className="alaia-entrance-text">Tu viaje ya está asociado a tu cuenta. Si Alaia te pide iniciar sesión, usa el mismo correo de esta invitación.</p>
        )}
        <div className="alaia-entrance-form">
          <button type="button" onClick={() => navigate(`/trips/${acceptedTripId}`, { replace: true })}>Continuar aquí →</button>
          {!standalone && <button type="button" onClick={() => navigate('/trips', { replace: true })}>Ya instalé Alaia</button>}
        </div>
      </InviteFrame>
    );
  }

  const acceptError = accept.error instanceof PlatformApiError ? accept.error : null;
  if (acceptError?.status === 403) return <InviteWrongEmail />;

  const busy = accept.isPending || decline.isPending;
  const owner = invitation.ownerDisplayName;
  const tripTitle = invitation.trip?.title;

  return (
    <InviteFrame title={inviteCopy.decisionTitle}>
      {owner && tripTitle ? (
        <p className="alaia-entrance-text">{inviteCopy.ownerShares(owner, tripTitle)}</p>
      ) : null}
      <div className="alaia-entrance-form">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            accept.mutate(undefined, {
              onSuccess: (data) => setAcceptedTripId(data.tripId),
            })
          }
        >
          {inviteCopy.accept}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decline.mutate(undefined, { onSuccess: () => setDeclined(true) })}
        >
          {inviteCopy.decline}
        </button>
      </div>
      {acceptError && acceptError.status !== 403 ? (
        <p className="alaia-entrance-text" role="alert">
          {acceptError.message}
        </p>
      ) : null}
    </InviteFrame>
  );
}
