import { Link } from "react-router-dom";

// Estado honesto cuando la Experience no puede abrirse. Tres variantes CLARAMENTE
// distintas (nunca se confunden entre sí ni caen a Buenos Aires):
//   - empty     → el viaje existe pero su historia no está lista (estado de producto)
//   - not-found → el viaje no existe o no es accesible (estado de producto)
//   - error     → fallo técnico real, reintentable (no es "sin historia")
// Misma paleta que el umbral (alaia-entrance), igual que RouteError.
export type ExperienceUnavailableVariant = "empty" | "not-found" | "error";

interface Copy {
  title: string;
  text: string;
}

const COPY: Record<ExperienceUnavailableVariant, Copy> = {
  empty: {
    title: "Tu historia todavía no está lista.",
    text: "Este viaje todavía no tiene una historia para vivir. Cuando esté disponible, la vas a encontrar aquí.",
  },
  "not-found": {
    title: "No encontramos este viaje.",
    text: "El viaje que buscas no existe o no tienes acceso. Vuelve a tus viajes para seguir.",
  },
  error: {
    title: "Algo se interrumpió.",
    text: "No pudimos cargar la historia en este momento — tus recuerdos siguen guardados. Prueba de nuevo.",
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
  const backLabel = variant === "empty" && tripId
    ? "← Volver a la portada"
    : "← Volver a Mis viajes";

  return (
    <div className="alaia-entrance">
      <div className="alaia-entrance-content">
        <p className="alaia-eyebrow">Alaia</p>
        <h1 className="alaia-entrance-title">{copy.title}</h1>
        <p className="alaia-entrance-text">{copy.text}</p>
        {variant === "error" ? (
          <form
            className="alaia-entrance-form"
            onSubmit={(event) => {
              event.preventDefault();
              window.location.reload();
            }}
          >
            <button type="submit">Reintentar →</button>
          </form>
        ) : (
          <div className="alaia-entrance-form">
            <Link className="alaia-entrance-secondary" to={backTo}>
              {backLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
