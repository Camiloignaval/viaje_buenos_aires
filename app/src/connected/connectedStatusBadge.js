// Insignia mínima y discreta del estado de la Experiencia Conectada. Vive
// TOTALMENTE afuera de #app: nunca toca el árbol que pinta render.js, así que
// no puede interferir con narrativa/álbum/ourMoment/Director Mode. Solo lee
// connectedReadiness (nunca lo modifica ni dispara red). En modo local no
// se monta nada.

import { connectedReadiness, ReadinessStatus } from './connectedReadiness.js';

const BADGE_CLASS = 'connected-status-badge';

/** Traduce el estado agregado a lo que se muestra — sin tocar el DOM, testable sin jsdom. */
export function describeBadge(readinessState) {
  if (readinessState.status === ReadinessStatus.LOCAL) {
    return null;
  }
  if (readinessState.status === ReadinessStatus.LOADING) {
    return { text: 'Conectando viaje…', tone: 'loading' };
  }
  if (readinessState.status === ReadinessStatus.ERROR) {
    return { text: 'No pudimos conectar este viaje', tone: 'error' };
  }
  // ready, partial y empty son variantes de "conectado sin error" — la
  // insignia es deliberadamente discreta, no expone esa distinción técnica.
  return { text: 'Viaje conectado', tone: 'success' };
}

/** Monta (o no) la insignia según connectedReadiness. Crea el elemento en `doc.body`, nunca dentro de `#app`. */
export function mountConnectedStatusBadge(readiness = connectedReadiness, doc = document) {
  let badgeEl = null;

  function render(state) {
    const view = describeBadge(state);
    if (!view) {
      badgeEl?.remove();
      badgeEl = null;
      return;
    }
    if (!badgeEl) {
      badgeEl = doc.createElement('div');
      badgeEl.className = BADGE_CLASS;
      doc.body.appendChild(badgeEl);
    }
    badgeEl.textContent = view.text;
    badgeEl.dataset.tone = view.tone;
  }

  readiness.subscribe(render);
  render(readiness.getState());
}
