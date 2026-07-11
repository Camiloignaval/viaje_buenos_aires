import { Link } from "react-router-dom";
import { inviteCopy } from "../copy";
import { InviteFrame } from "./InviteFrame";
import type { InvitationPreview } from "../types";

// Sin sesión: explica y guía al login (con returnTo a esta misma invitación).
// NO ofrece aceptar — la aceptación es voluntaria y con el correo correcto.
export function InviteUnauthenticated({ token, invitation }: { token: string; invitation: InvitationPreview }) {
  const owner = invitation.ownerDisplayName;
  const tripTitle = invitation.trip?.title;
  const returnTo = encodeURIComponent(`/invite/${token}`);

  return (
    <InviteFrame title={inviteCopy.invitedTitle}>
      {owner && tripTitle ? (
        <p className="alaia-entrance-text">{inviteCopy.ownerShares(owner, tripTitle)}</p>
      ) : null}
      <p className="alaia-entrance-text">{inviteCopy.loginPrompt}</p>
      <div className="alaia-entrance-form">
        <Link to={`/login?returnTo=${returnTo}`}>{inviteCopy.loginCta}</Link>
      </div>
    </InviteFrame>
  );
}
