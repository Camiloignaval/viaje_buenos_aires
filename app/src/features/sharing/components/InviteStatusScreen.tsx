import { Link } from "react-router-dom";
import { inviteCopy, inviteStatusCopy } from "../copy";
import { InviteFrame } from "./InviteFrame";

type Variant = keyof typeof inviteStatusCopy;

// Estados terminales de una invitación (o error de carga): copy propio, sin
// errores técnicos visibles, con una salida clara hacia Mis viajes.
export function InviteStatusScreen({ variant }: { variant: Variant }) {
  const copy = inviteStatusCopy[variant];
  return (
    <InviteFrame title={copy.title}>
      <p className="alaia-entrance-text">{copy.text}</p>
      <div className="alaia-entrance-form">
        <Link to="/trips">{inviteCopy.backToTrips}</Link>
      </div>
    </InviteFrame>
  );
}
