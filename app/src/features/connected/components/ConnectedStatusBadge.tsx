import { useConnectedReadiness } from "../hooks/useConnectedReadiness";
import { describeBadge } from "../lib/badge";
import "./connectedStatusBadge.css";

// Insignia discreta del estado de la Experiencia Conectada (position: fixed, fuera
// del flujo). En modo local no renderiza nada. Espejo de connectedStatusBadge.js,
// que vivía fuera de #app; acá vive en el árbol React pero sin afectar el layout.
export function ConnectedStatusBadge() {
  const readiness = useConnectedReadiness();
  const view = describeBadge(readiness);
  if (!view) {
    return null;
  }
  return (
    <div className="connected-status-badge" data-tone={view.tone}>
      {view.text}
    </div>
  );
}
