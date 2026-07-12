import { useParams } from "react-router-dom";
import { PlatformApiError } from "@/services/platformClient";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { useSession } from "@/features/auth/hooks/useSession";
import { useInvitationPreview } from "../hooks/useInvitationPreview";
import { maskEmail } from "../lib/maskEmail";
import { InviteStatusScreen } from "../components/InviteStatusScreen";
import { InviteUnauthenticated } from "../components/InviteUnauthenticated";
import { InviteWrongEmail } from "../components/InviteWrongEmail";
import { InviteDecision } from "../components/InviteDecision";

// Vista pública de una invitación (/invite/:token). Orquesta:
//  · carga / token inválido (404) / error → estado honesto
//  · invitación no-pending → estado terminal (expirada/revocada/rechazada/aceptada)
//  · sin sesión → guía al login (con returnTo); no ofrece aceptar
//  · con sesión, correo distinto → estado "otro correo" (server valida igual)
//  · con sesión, correo coincidente → decisión Aceptar/Rechazar
// Default export para lazy() en el router.
export default function InvitePage() {
  const { token = "" } = useParams();
  const preview = useInvitationPreview(token);
  const session = useSession();

  if (preview.isLoading) return <LoadingScreen />;
  if (preview.isError || !preview.data) {
    const status = preview.error instanceof PlatformApiError ? preview.error.status : 0;
    return <InviteStatusScreen variant={status === 404 ? "not-found" : "error"} />;
  }

  const invitation = preview.data.invitation;
  if (invitation.status !== "pending") {
    return <InviteStatusScreen variant={invitation.status} />;
  }

  if (session.status === "checking") return <LoadingScreen />;
  if (session.status !== "authenticated") {
    return <InviteUnauthenticated token={token} invitation={invitation} />;
  }

  // Comparación proactiva por email enmascarado (solo UX; el server valida en /accept).
  const sessionMasked = maskEmail(session.user?.email ?? "");
  if (invitation.invitedEmailMasked && sessionMasked !== invitation.invitedEmailMasked) {
    return <InviteWrongEmail />;
  }

  return <InviteDecision token={token} invitation={invitation} />;
}
