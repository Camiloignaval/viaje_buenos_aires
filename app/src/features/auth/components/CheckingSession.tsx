import { AuroraParticles } from "@/components/animations/AuroraParticles";

// El loading no es un "cargando": es Alaia preparando algo. El halo es el
// protagonista —respira con un resplandor dorado y una luz recorre su borde muy
// lento—; el texto sólo acompaña. Todo se escribe con el revelado lento de
// Alaia (aurora-reveal, clon de fadeInSoft). Copy idéntica a renderChecking().
export function CheckingSession() {
  return (
    <div className="aurora-entrance">
      <AuroraParticles subtle />
      <div className="aurora-loading" role="status" aria-live="polite">
        <p className="aurora-eyebrow aurora-reveal aurora-reveal-1">Alaia</p>
        <div className="aurora-halo aurora-reveal aurora-reveal-2" aria-hidden="true">
          <span className="aurora-halo-ring" />
          <span className="aurora-halo-orbit">
            <span className="aurora-halo-light" />
          </span>
        </div>
        <p className="aurora-loading-text aurora-reveal aurora-reveal-3">Revisando tu sesión…</p>
        <p className="aurora-loading-hint aurora-reveal aurora-reveal-4">Un instante.</p>
      </div>
    </div>
  );
}
