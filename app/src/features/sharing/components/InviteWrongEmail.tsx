import { Link } from "react-router-dom";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { inviteCopy } from "../copy";
import { InviteFrame } from "./InviteFrame";

// El correo de sesión no coincide con el invitado: estado honesto, sin revelar el
// correo completo. Al cerrar sesión, la página vuelve al estado "sin sesión" con
// el CTA de iniciar con el correo correcto.
export function InviteWrongEmail() {
  const logout = useLogout();
  return (
    <InviteFrame title={inviteCopy.wrongEmailTitle}>
      <p className="alaia-entrance-text">{inviteCopy.wrongEmailText}</p>
      <div className="alaia-entrance-form">
        <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending}>
          {inviteCopy.logout}
        </button>
        <Link to="/trips">{inviteCopy.backToTrips}</Link>
      </div>
    </InviteFrame>
  );
}
