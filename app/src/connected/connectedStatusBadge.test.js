import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeBadge, mountConnectedStatusBadge } from './connectedStatusBadge.js';
import { ReadinessStatus } from './connectedReadiness.js';

function fakeReadiness(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(next) {
      state = next;
      listeners.forEach((listener) => listener(state));
    },
  };
}

function fakeDocument() {
  const created = [];
  return {
    created,
    createElement: () => {
      const el = { className: '', textContent: '', dataset: {}, removed: false, remove() { this.removed = true; } };
      created.push(el);
      return el;
    },
    body: { appendChild: () => {} },
  };
}

test('no aparece en modo local', () => {
  assert.equal(describeBadge({ status: ReadinessStatus.LOCAL, error: null }), null);
});

test('aparece "Conectando viaje…" en loading', () => {
  assert.deepEqual(describeBadge({ status: ReadinessStatus.LOADING, error: null }), { text: 'Conectando viaje…', tone: 'loading' });
});

test('aparece "Viaje conectado" cuando ready (y también en partial/empty)', () => {
  assert.deepEqual(describeBadge({ status: ReadinessStatus.READY, error: null }), { text: 'Viaje conectado', tone: 'success' });
  assert.equal(describeBadge({ status: ReadinessStatus.PARTIAL, error: null }).tone, 'success');
  assert.equal(describeBadge({ status: ReadinessStatus.EMPTY, error: null }).tone, 'success');
});

test('aparece error cuando falla', () => {
  assert.deepEqual(describeBadge({ status: ReadinessStatus.ERROR, error: 'no se pudo' }), {
    text: 'No pudimos conectar este viaje',
    tone: 'error',
  });
});

test('mount: no crea ningún elemento en modo local', () => {
  const readiness = fakeReadiness({ status: ReadinessStatus.LOCAL, error: null });
  const doc = fakeDocument();
  mountConnectedStatusBadge(readiness, doc);
  assert.equal(doc.created.length, 0);
});

test('mount: crea la insignia al conectar y la actualiza en cada transición', () => {
  const readiness = fakeReadiness({ status: ReadinessStatus.LOADING, error: null });
  const doc = fakeDocument();
  mountConnectedStatusBadge(readiness, doc);

  assert.equal(doc.created.length, 1);
  assert.equal(doc.created[0].textContent, 'Conectando viaje…');
  assert.equal(doc.created[0].dataset.tone, 'loading');

  readiness.emit({ status: ReadinessStatus.READY, error: null });
  assert.equal(doc.created.length, 1, 'reusa el mismo elemento, no crea uno nuevo');
  assert.equal(doc.created[0].textContent, 'Viaje conectado');
  assert.equal(doc.created[0].dataset.tone, 'success');
});

test('mount: la quita si vuelve a local', () => {
  const readiness = fakeReadiness({ status: ReadinessStatus.LOADING, error: null });
  const doc = fakeDocument();
  mountConnectedStatusBadge(readiness, doc);

  readiness.emit({ status: ReadinessStatus.LOCAL, error: null });
  assert.equal(doc.created[0].removed, true);
});

test('no rompe el render principal: mount nunca toca nada fuera de doc.body (nunca referencia #app)', () => {
  const readiness = fakeReadiness({ status: ReadinessStatus.ERROR, error: 'x' });
  const appEl = { touched: false };
  const doc = fakeDocument();
  doc.getElementById = () => { appEl.touched = true; return appEl; };
  mountConnectedStatusBadge(readiness, doc);
  assert.equal(appEl.touched, false);
});
