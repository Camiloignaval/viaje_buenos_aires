import { Link } from "react-router-dom";

// Estado honesto cuando la Experience no puede abrirse. Tres variantes CLARAMENTE
// distintas (nunca se confunden entre sí ni caen a Buenos Aires):
//   - empty     → el viaje existe pero su historia no está lista (estado de producto)
//   - not-found → el viaje no existe o no es accesible (estado de producto)
//   - error     → fallo técnico real, reintentable (no es "sin historia")
// Misma paleta que el umbral (aurora-entrance), igual que RouteError.
export type ExperienceUnavailableVariant = "empty" | "not-found" | "error";

interface Copy {
  title: string;
  text: string;
}

const COPY: Record<ExperienceUnavailableVariant, Copy> = {
  empty: {
    title: "Tu historia todavía no está lista.",
    text: "Este viaje todavía no tiene una historia para vivir. Cuando esté disponible, la vas a encontrar acá.",
  },
  "not-found": {
    title: "No encontramos este viaje.",
    text: "El viaje que buscás no existe o no tenés acceso. Volvé a tus viajes para seguir.",
  },
  error: {
    title: "Algo se interrumpió.",
    text: "No pudimos cargar la historia en este momento — tus recuerdos siguen guardados. Probá de nuevo.",
  },
};

export function ExperienceUnavailable({
  variant,
  tripId,
}: {
  variant: ExperienceUnavailableVariant;
  tripId?: string | null;
}) {
  const copy = COPY[variant];
  // En `empty` el viaje existe → se vuelve a SU portada; en el resto, a la lista.
  const backTo = variant === "empty" && tripId ? `/trips/${tripId}` : "/trips";

  return (
    <div className="aurora-entrance">
      <div className="aurora-entrance-content">
        <p className="aurora-eyebrow">Aurora</p>
        <h1 className="aurora-entrance-title">{copy.title}</h1>
        <p className="aurora-entrance-text">{copy.text}</p>
        {variant === "error" ? (
          <form
            className="aurora-entrance-form"
            onSubmit={(event) => {
              event.preventDefault();
              window.location.reload();
            }}
          >
            <button type="submit">Reintentar →</button>
          </form>
        ) : (
          <div className="aurora-entrance-form">
            <Link to={backTo}>Volver a mis viajes →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
