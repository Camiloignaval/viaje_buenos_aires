import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { render } from '@react-email/render';
import { WelcomeEmail, VerifyEmail, ResetPasswordEmail, TripReadyEmail, DailyMomentEmail } from './index.js';

async function renderHtml(Component, props) {
  return render(createElement(Component, props));
}

test('WelcomeEmail interpola el nombre y el link de la app', async () => {
  const html = await renderHtml(WelcomeEmail, { name: 'Cami', appUrl: 'https://aurora.cl/app' });
  assert.match(html, /Hola Cami/);
  assert.match(html, /href="https:\/\/aurora\.cl\/app"/);
});

test('VerifyEmail muestra el código cuando se pasa', async () => {
  const html = await renderHtml(VerifyEmail, { code: '482913' });
  assert.match(html, /482913/);
});

test('VerifyEmail muestra el botón cuando se pasa verifyUrl', async () => {
  const html = await renderHtml(VerifyEmail, { verifyUrl: 'https://aurora.cl/verify/abc' });
  assert.match(html, /href="https:\/\/aurora\.cl\/verify\/abc"/);
});

test('ResetPasswordEmail incluye el link de reseteo', async () => {
  const html = await renderHtml(ResetPasswordEmail, { resetUrl: 'https://aurora.cl/reset/xyz' });
  assert.match(html, /href="https:\/\/aurora\.cl\/reset\/xyz"/);
});

test('TripReadyEmail muestra destino y link del viaje', async () => {
  const html = await renderHtml(TripReadyEmail, {
    destination: 'Buenos Aires',
    startDate: '2026-08-10',
    endDate: '2026-08-15',
    tripUrl: 'https://aurora.cl/trip/1',
  });
  assert.match(html, /Buenos Aires/);
  assert.match(html, /href="https:\/\/aurora\.cl\/trip\/1"/);
});

test('DailyMomentEmail muestra el recuerdo y la imagen', async () => {
  const html = await renderHtml(DailyMomentEmail, {
    memoryTitle: 'Tu primer día',
    memoryText: 'Caminamos por Recoleta',
    imageUrl: 'https://aurora.cl/img/1.jpg',
  });
  assert.match(html, /Tu primer día/);
  assert.match(html, /Caminamos por Recoleta/);
  assert.match(html, /src="https:\/\/aurora\.cl\/img\/1\.jpg"/);
});
