import { Link } from "react-router-dom";
import type { Trip } from "../types";
import {
  describeTripTemporalCompanion,
  describeTripTemporalState,
  type TripTemporalState,
} from "../lib/countdown";
import { countryIdentity, coverDateLine } from "../lib/coverDetails";
import { formatDestination } from "../lib/formatDestination";
import type { TripLifecycle } from "../lib/initialDestination";

function temporalLabel(temporalState: TripTemporalState | null): string | null {
  return temporalState ? describeTripTemporalState(temporalState) : null;
}

// Portada del viaje activo. Se reutiliza en dos contextos con destino distinto,
// vía la prop `to` (navegación SPA, nunca hard nav):
//   - lista general (TripsPage) → enlaza a la Portada del viaje (/trips/:id)
//   - Portada (TripHomePage)    → enlaza a la Experience (/experience?tripId=)
// `showAction` vuelve el CTA story-aware: en la Portada solo aparece si la
// historia ya está resuelta (nunca invita a entrar a algo que no existe).
export function ActiveTripHome(props: {
  trip: Trip;
  lifecycle: TripLifecycle;
  temporalState: TripTemporalState | null;
  to: string;
  showAction?: boolean;
}) {
  const { trip, temporalState, to, showAction = true } = props;
  const countdown = temporalLabel(temporalState);
  const companion = temporalState
    ? describeTripTemporalCompanion(temporalState)
    : "Todo listo para cuando quieras entrar.";
  const dates = coverDateLine(trip.startDateTime, trip.endDateTime);
  const identity =
    typeof trip.destination === "string"
      ? null
      : countryIdentity(trip.destination.countryCode, trip.destination.countryName);

  return (
    <section className="active-trip-home alaia-reveal alaia-reveal-3" aria-label="Portada del viaje activo">
      <p className="active-trip-home-kicker">Nuestra historia</p>
      <h2 className="active-trip-home-title">{trip.title}</h2>
      <div className="active-trip-home-location">
        {identity && (
          <span className="active-trip-home-country" role="img" aria-label={identity.label}>
            {identity.mark}
          </span>
        )}
        <p className="active-trip-home-destination">{formatDestination(trip.destination)}</p>
      </div>
      {dates && <p className="active-trip-home-dates">{dates}</p>}
      <div className="active-trip-home-temporal">
        {countdown && <p className="active-trip-home-countdown">{countdown}</p>}
        <p className="active-trip-home-preparations">{companion}</p>
      </div>
      {showAction && (
        <Link className="active-trip-home-action" to={to}>
          Entrar al viaje
        </Link>
      )}
    </section>
  );
}
