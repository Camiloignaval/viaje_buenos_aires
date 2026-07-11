import { AlaiaParticles } from "@/components/animations/AlaiaParticles";

// Estado recuperable de sesión (status "unavailable"): no se pudo verificar la
// sesión por un fallo transitorio (red/timeout/5xx). NO se asume que el usuario
// cerró sesión ni se lo expulsa a /login: se ofrece reintentar. Mismo lenguaje
// visual que el umbral.
export function SessionUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="alaia-entrance">
      <AlaiaParticles subtle />
      <div className="alaia-entrance-content" role="alert" aria-live="polite">
        <p className="alaia-eyebrow alaia-reveal alaia-reveal-1">Alaia</p>
        <h1 className="alaia-entrance-title alaia-reveal alaia-reveal-2">
          No pudimos verificar tu sesión.
        </h1>
        <p className="alaia-entrance-text alaia-reveal alaia-reveal-3">
          Puede ser la conexión. Tus recuerdos siguen guardados — probá de nuevo
          en un momento.
        </p>
        <form
          className="alaia-entrance-form alaia-reveal alaia-reveal-4"
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
