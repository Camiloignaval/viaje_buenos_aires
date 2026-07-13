import { Link } from "react-router-dom";
import type { Trip } from "../types";
import { toRoman } from "../lib/toRoman";
import { tripHomeUrl } from "../lib/tripUrl";
import { formatDestination } from "../lib/formatDestination";
import { safeTripTemporalState, describeTripTemporalState } from "../lib/countdown";

// "Faltan 8 días" / "Mañana comienza esta historia" / "Día 2 de 4" / etc. —
// solo para viajes con el modelo de fechas nuevo (legacy sin startDateTime/
// endDateTime, o con destination como string plano, simplemente no muestran
// nada acá — no hay forma de calcularlo sin timezone del destino). Usa la
// variante "safe": un dato corrupto o mal migrado nunca debe romper el
// render de toda la lista, solo omitir el countdown de esa fila.
function temporalStatus(trip: Trip, now: Date): string | null {
  if (!trip.startDateTime || !trip.endDateTime || typeof trip.destination !== "object") return null;
  const state = safeTripTemporalState(now, trip.startDateTime, trip.endDateTime, trip.destination.timezone);
  return state ? describeTripTemporalState(state) : null;
}

// Cada viaje es un capítulo del índice: una pila centrada —numeral romano en
// cursiva, título, destino como promesa breve—, sin caja ni separador ni
// "Entrar →". Mismo registro que .chapter-index de Experience.
//
// `featured` distingue la historia activa cuando aparece en "Mis viajes": en vez
// del numeral lleva un antetítulo ("Tu historia") y una discreta invitación a
// abrir ("Abrir el viaje →"). Es el UMBRAL hacia la Portada (/trips/:id), no la
// Portada en sí: mantenerlo en registro de capítulo —no una tarjeta— es lo que
// evita la sensación de dos portadas casi iguales.
export function TripEntry({
  trip,
  index,
  now,
  featured = false,
}: {
  trip: Trip;
  index: number;
  now: Date;
  featured?: boolean;
}) {
  const status = temporalStatus(trip, now);

  return (
    <li className={featured ? "trip-index-item trip-index-item--featured" : "trip-index-item"}>
      <Link className={featured ? "trip-entry trip-entry--featured" : "trip-entry"} to={tripHomeUrl(trip.id)}>
        {featured ? (
          <span className="trip-entry-kicker">Tu historia</span>
        ) : (
          <span className="trip-entry-number" aria-hidden="true">
            {toRoman(index + 1)}
          </span>
        )}
        <span className="trip-entry-text">
          <span className="trip-entry-title">{trip.title}</span>
          <span className="trip-entry-status">{formatDestination(trip.destination)}</span>
          {status && <span className="trip-entry-countdown">{status}</span>}
        </span>
        {featured && (
          <span className="trip-entry-open" aria-hidden="true">
            Abrir el viaje →
          </span>
        )}
      </Link>
    </li>
  );
}
