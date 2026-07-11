import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { render } from '@react-email/render';
import {
  WelcomeEmail,
  VerifyEmail,
  ResetPasswordEmail,
  TripReadyEmail,
  DailyMomentEmail,
  FeedbackReceivedEmail,
  FeedbackNotificationEmail,
} from './index.js';

async function renderHtml(Component, props) {
  return render(createElement(Component, props));
}

test('WelcomeEmail interpola el nombre y el link de la app', async () => {
  const html = await renderHtml(WelcomeEmail, { name: 'Cami', appUrl: 'https://alaia.cl/app' });
  assert.match(html, /Hola Cami/);
  assert.match(html, /href="https:\/\/alaia\.cl\/app"/);
});

test('VerifyEmail muestra el código cuando se pasa', async () => {
  const html = await renderHtml(VerifyEmail, { code: '482913' });
  assert.match(html, /482913/);
});

test('VerifyEmail muestra el botón cuando se pasa verifyUrl', async () => {
  const html = await renderHtml(VerifyEmail, { verifyUrl: 'https://alaia.cl/verify/abc' });
  assert.match(html, /href="https:\/\/alaia\.cl\/verify\/abc"/);
});

test('ResetPasswordEmail incluye el link de reseteo', async () => {
  const html = await renderHtml(ResetPasswordEmail, { resetUrl: 'https://alaia.cl/reset/xyz' });
  assert.match(html, /href="https:\/\/alaia\.cl\/reset\/xyz"/);
});

test('TripReadyEmail muestra destino y link del viaje', async () => {
  const html = await renderHtml(TripReadyEmail, {
    destination: 'Buenos Aires',
    startDate: '2026-08-10',
    endDate: '2026-08-15',
    tripUrl: 'https://alaia.cl/trip/1',
  });
  assert.match(html, /Buenos Aires/);
  assert.match(html, /10 de agosto/);
  assert.match(html, /15 de agosto/);
  assert.match(html, /href="https:\/\/alaia\.cl\/trip\/1"/);
});

test('DailyMomentEmail muestra el recuerdo y la imagen', async () => {
  const html = await renderHtml(DailyMomentEmail, {
    memoryTitle: 'Tu primer día',
    memoryText: 'Caminamos por Recoleta',
    imageUrl: 'https://alaia.cl/img/1.jpg',
  });
  assert.match(html, /Tu primer día/);
  assert.match(html, /Caminamos por Recoleta/);
  assert.match(html, /src="https:\/\/alaia\.cl\/img\/1\.jpg"/);
});

test('FeedbackReceivedEmail confirma el mensaje con tono Alaia', async () => {
  const html = await renderHtml(FeedbackReceivedEmail, { name: 'Kari', appUrl: 'https://alaia.cl' });
  assert.match(html, /Recibimos tu mensaje/);
  assert.match(html, /Alaia/);
});

test('FeedbackNotificationEmail muestra contexto interno sin pedir identidad al frontend', async () => {
  const html = await renderHtml(FeedbackNotificationEmail, {
    feedback: { category: 'sugerencia', message: 'Más calma en el wizard.', createdAt: '2026-07-11' },
    user: { displayName: 'Kari', email: 'kari@example.com', residenceCountryCode: 'CL' },
  });
  assert.match(html, /Nueva sugerencia en Alaia/);
  assert.match(html, /kari@example\.com/);
  assert.match(html, /Más calma en el wizard/);
});
