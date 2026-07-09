// Helper puro de navegación para "Mis viajes" — el render/wiring real vive en
// ConnectedShell (connectedShell.js). No toca DOM ni red: abrir un viaje nunca
// renderiza Aurora acá, solo navega a experience.html.

export function tripUrl(tripId) {
  return `/experience.html?tripId=${encodeURIComponent(tripId)}`;
}
