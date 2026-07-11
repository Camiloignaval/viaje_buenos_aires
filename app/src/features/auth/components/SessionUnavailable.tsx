import { AuroraParticles } from "@/components/animations/AuroraParticles";

// Estado recuperable de sesión (status "unavailable"): no se pudo verificar la
// sesión por un fallo transitorio (red/timeout/5xx). NO se asume que el usuario
// cerró sesión ni se lo expulsa a /login: se ofrece reintentar. Mismo lenguaje
// visual que el umbral.
export function SessionUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="aurora-entrance">
      <AuroraParticles subtle />
      <div className="aurora-entrance-content" role="alert" aria-live="polite">
        <p className="aurora-eyebrow aurora-reveal aurora-reveal-1">Alaia</p>
        <h1 className="aurora-entrance-title aurora-reveal aurora-reveal-2">
          No pudimos verificar tu sesión.
        </h1>
        <p className="aurora-entrance-text aurora-reveal aurora-reveal-3">
          Puede ser la conexión. Tus recuerdos siguen guardados — probá de nuevo
          en un momento.
        </p>
        <form
          className="aurora-entrance-form aurora-reveal aurora-reveal-4"
          onSubmit={(event) => {
            event.preventDefault();
            onRetry();
          }}
        >
          <button type="submit">Reintentar →</button>
        </form>
      </div>
    </div>
  );
}
