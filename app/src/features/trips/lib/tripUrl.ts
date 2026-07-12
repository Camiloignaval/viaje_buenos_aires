// Abrir un viaje navega a la ruta React de la experience con el tripId como
// query param (la experience lee ?tripId= para resolver su historia real).
export function tripUrl(tripId: string): string {
  return `/experience?tripId=${encodeURIComponent(tripId)}`;
}

// La Portada del viaje (`/trips/:tripId`): el universo del viaje recién creado y
// el punto desde donde se entra voluntariamente a la Experience.
export function tripHomeUrl(tripId: string): string {
  return `/trips/${encodeURIComponent(tripId)}`;
}
