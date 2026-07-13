import { useState } from "react";
import type { Trip } from "@/features/trips/types";
import { useTripInvitations } from "../hooks/useTripInvitations";
import { useRevokeInvitation } from "../hooks/useInvitationMutations";
import { CreateInvitationDialog } from "./CreateInvitationDialog";
import "../sharing.css";

// Cierre editorial de la Portada: invitar a alguien a VIVIR esta historia, no
// "agregar un miembro". Solo el owner ve la invitación; el editor ve una nota
// discreta de que ya comparte la historia. Nada de tono administrativo: es parte
// del relato, con el mismo lenguaje visual de Alaia.
export function TripInvitePanel({ trip }: { trip: Trip }) {
  const isOwner = trip.role === "owner";
  const [dialogOpen, setDialogOpen] = useState(false);
  const invitations = useTripInvitations(trip.id, isOwner);
  const revoke = useRevokeInvitation(trip.id);

  if (!isOwner) {
    return <p className="invite-panel-editor">Compartes esta historia.</p>;
  }

  const members = trip.members?.length ?? 1;
  const pending = invitations.data?.invitations ?? [];
  const capacity = trip.expectedTravelers ?? members;
  const available = Math.max(0, capacity - members - pending.length);

  const seatsOpen = available > 0;
  const awaitingReply = available === 0 && pending.length > 0;
  const complete = available === 0 && pending.length === 0;

  return (
    <section className="invite-invitation" aria-label="Compartir esta historia">
      <p className="invite-invitation-kicker">Compartir este viaje</p>

      {dialogOpen ? (
        <CreateInvitationDialog tripId={trip.id} onClose={() => setDialogOpen(false)} />
      ) : (
        <>
          {invitations.isPending && (
            <p className="invite-invitation-line">Estamos preparando este momento para compartir.</p>
          )}

          {invitations.isError && (
            <>
              <p className="invite-invitation-line" role="alert">
                No pudimos revisar las invitaciones pendientes.
              </p>
              <button type="button" className="invite-panel-cta" onClick={() => void invitations.refetch()}>
                Reintentar
              </button>
            </>
          )}

          {invitations.isSuccess && seatsOpen && (
            <>
              <p className="invite-invitation-line">
                {available === 1
                  ? "Todavía hay un lugar reservado para alguien con quien quieras vivir esta historia."
                  : `Todavía quedan ${available} lugares para quienes quieras que la vivan contigo.`}
              </p>
              <button
                type="button"
                className="invite-panel-cta"
                onClick={() => setDialogOpen(true)}
              >
                Invitar a esta historia →
              </button>
            </>
          )}

          {invitations.isSuccess && awaitingReply && (
            <p className="invite-invitation-line">Tu invitación ya está en camino.</p>
          )}

          {invitations.isSuccess && complete && (
            <p className="invite-invitation-line invite-invitation-line--complete">
              Ya están todos los que tenían que estar en esta historia.
            </p>
          )}
        </>
      )}

      {pending.length > 0 ? (
        <div className="invite-panel-pending-wrap">
          <p className="invite-panel-pending-title">Invitaciones en camino</p>
          <ul className="invite-panel-pending">
            {pending.map((invitation) => (
              <li key={invitation.invitationId}>
                <span>{invitation.invitedEmailMasked}</span>
                <button
                  type="button"
                  onClick={() => revoke.mutate(invitation.invitationId)}
                  disabled={revoke.isPending}
                >
                  Revocar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
