import type { Trip } from "../types";
import { TripEntry } from "./TripEntry";

export function TripsIndex({ trips }: { trips: Trip[] }) {
  // Un solo "ahora" para todo el índice — todos los viajes de la lista miden
  // su estado temporal contra el mismo instante, no uno por render de fila.
  const now = new Date();

  return (
    <ul className="trips-index">
      {trips.map((trip, index) => (
        <TripEntry key={trip.id} trip={trip} index={index} now={now} />
      ))}
    </ul>
  );
}
