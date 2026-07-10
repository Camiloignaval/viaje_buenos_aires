// Recarga segura del contexto/story/media del viaje conectado: un solo punto
// de entrada para que una futura UI pida "refrescar" sin conocer los detalles
// de connectedContext/storyContentStore/connectedMediaStore. No hace polling
// (se llama una vez, a demanda), no edita contenido, no sube archivos, no
// borra nada — solo vuelve a resolver connectedContext. story/media se
// recargan solos porque ya están suscriptos a sus cambios (storyContentStore.js,
// connectedMediaStore.js) — no hace falta tocarlos acá.

import { connectedContext } from './connectedContext.js';

/** Sin tripId en la URL, no toca la red — mismo comportamiento que connectedContext.resolve(). */
export function refreshConnectedExperience(context = connectedContext, location) {
  return context.resolve(location);
}
