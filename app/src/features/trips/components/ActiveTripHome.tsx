import { Link } from "react-router-dom";
import type { Trip } from "../types";
import { describeTripTemporalState, type TripTemporalState } from "../lib/countdown";
import { formatDestination } from "../lib/formatDestination";
import type { TripLifecycle } from "../lib/initialDestination";

function actionLabel(lifecycle: TripLifecycle): string {
  if (lifecycle === "in-progress") return "Comenzar el día";
  return "Entrar al viaje";
}

function temporalLabel(temporalState: TripTemporalState | null): string | null {
  return temporalState ? describeTripTemporalState(temporalState) : null;
}

function preparationsLabel(trip: Trip): string {
  if (trip.accommodation?.name) return `Te espera ${trip.accommodation.name}.`;
  if (trip.accommodation?.neighborhood) return `Te espera ${trip.accommodation.neighborhood}.`;
  if (trip.travelContext) return trip.travelContext;
  return "Todo listo para cuando quieras entrar.";
}

// Portada del viaje activo. Se reutiliza en dos contextos con destino distinto,
// vía la prop `to` (navegación SPA, nunca hard nav):
//   - lista general (TripsPage) → enlaza a la Portada del viaje (/trips/:id)
//   - Portada (TripHomePage)    → enlaza a la Experience (/experience?tripId=)
// `showAction` vuelve el CTA story-aware: en la Portada solo aparece si la
// historia ya está resuelta (nunca invita a entrar a algo que no existe).
export function ActiveTripHome({
  trip,
  lifecycle,
  temporalState,
  to,
  showAction = true,
}: {
  trip: Trip;
  lifecycle: TripLifecycle;
  temporalState: TripTemporalState | null;
  to: string;
  showAction?: boolean;
}) {
  const countdown = temporalLabel(temporalState);

  return (
    <section className="active-trip-home alaia-reveal alaia-reveal-3" aria-label="Portada del viaje activo">
      <p className="active-trip-home-kicker">Nuestra historia</p>
      <h2 className="active-trip-home-title">{trip.title}</h2>
      <p className="active-trip-home-destination">{formatDestination(trip.destination)}</p>
      {countdown && <p className="active-trip-home-countdown">{countdown}</p>}
      <p className="active-trip-home-preparations">{preparationsLabel(trip)}</p>
      {showAction && (
        <Link className="active-trip-home-action" to={to}>
          {actionLabel(lifecycle)}
        </Link>
      )}
    </section>
  );
}
