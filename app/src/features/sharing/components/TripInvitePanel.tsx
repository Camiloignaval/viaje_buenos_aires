import { useState } from "react";
import type { Trip } from "@/features/trips/types";
import { useTripInvitations } from "../hooks/useTripInvitations";
import { useRevokeInvitation } from "../hooks/useInvitationMutations";
import { CreateInvitationDialog } from "./CreateInvitationDialog";
import "../sharing.css";

// Panel de compartir en la Portada. Solo el owner ve invitar / pendientes / cupos;
// el editor ve una nota discreta de que comparte la historia. No es un panel
// administrativo: mantiene el lenguaje editorial de Alaia.
export function TripInvitePanel({ trip }: { trip: Trip }) {
  const isOwner = trip.role === "owner";
  const [dialogOpen, setDialogOpen] = useState(false);
  const invitations = useTripInvitations(trip.id, isOwner);
  const revoke = useRevokeInvitation(trip.id);

  if (!isOwner) {
    return <p className="invite-panel-editor">Compartís esta historia.</p>;
  }

  const members = trip.members?.length ?? 1;
  const pending = invitations.data?.invitations ?? [];
  const capacity = trip.expectedTravelers ?? members;
  const available = Math.max(0, capacity - members - pending.length);

  return (
    <section className="invite-panel" aria-label="Compartir esta historia">
      <p className="invite-panel-summary">
        <span>{members === 1 ? "1 persona" : `${members} personas`}</span>
        {pending.length > 0 ? <span> · {pending.length === 1 ? "1 pendiente" : `${pending.length} pendientes`}</span> : null}
        {available > 0 ? <span> · {available === 1 ? "1 lugar libre" : `${available} lugares libres`}</span> : null}
      </p>

      {dialogOpen ? (
        <CreateInvitationDialog tripId={trip.id} onClose={() => setDialogOpen(false)} />
      ) : (
        <button
          type="button"
          className="invite-panel-cta"
          onClick={() => setDialogOpen(true)}
          disabled={available <= 0}
        >
          Invitar a esta historia →
        </button>
      )}

      {pending.length > 0 ? (
        <ul className="invite-panel-pending">
          {pending.map((invitation) => (
            <li key={invitation.invitationId}>
              <span>{invitation.invitedEmailMasked}</span>
              <button type="button" onClick={() => revoke.mutate(invitation.invitationId)} disabled={revoke.isPending}>
                Revocar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
