import type { Trip } from "../types";

/** Viajes legacy guardan destination como string; los nuevos, como objeto estructurado. */
export function formatDestination(destination: Trip["destination"]): string {
  if (typeof destination === "string") return destination;
  return destination.adminName
    ? `${destination.cityName}, ${destination.adminName}`
    : `${destination.cityName}, ${destination.countryName}`;
}
