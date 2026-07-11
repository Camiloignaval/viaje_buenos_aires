import { AlaiaParticles } from "@/components/animations/AlaiaParticles";

// El loading no es un "cargando": es Alaia preparando algo. El halo es el
// protagonista —respira con un resplandor dorado y una luz recorre su borde muy
// lento—; el texto sólo acompaña. Todo se escribe con el revelado lento de
// Alaia (alaia-reveal, clon de fadeInSoft). Copy idéntica a renderChecking().
export function CheckingSession() {
  return (
    <div className="alaia-entrance">
      <AlaiaParticles subtle />
      <div className="alaia-loading" role="status" aria-live="polite">
        <p className="alaia-eyebrow alaia-reveal alaia-reveal-1">Alaia</p>
        <div className="alaia-halo alaia-reveal alaia-reveal-2" aria-hidden="true">
          <span className="alaia-halo-ring" />
          <span className="alaia-halo-orbit">
            <span className="alaia-halo-light" />
          </span>
        </div>
        <p className="alaia-loading-text alaia-reveal alaia-reveal-3">Revisando tu sesión…</p>
        <p className="alaia-loading-hint alaia-reveal alaia-reveal-4">Un instante.</p>
      </div>
    </div>
  );
}
