import { createElement as h } from 'react';
import { AlaiaLayout } from '../layouts/AlaiaLayout.js';
import { EmailCard } from '../components/EmailCard.js';
import { SectionTitle } from '../components/SectionTitle.js';
import { styles, theme } from '../theme.js';

function row(label, value) {
  if (value == null || value === '') return null;
  return h(
    'p',
    { style: { ...styles.text, margin: '8px 0' } },
    h('strong', { style: { color: theme.colors.text } }, `${label}: `),
    String(value),
  );
}

export function FeedbackNotificationEmail({ feedback = {}, user = {}, appUrl = '' } = {}) {
  return h(
    AlaiaLayout,
    { previewText: 'Nueva sugerencia recibida en Alaia', appUrl },
    h(
      EmailCard,
      null,
      h(SectionTitle, null, 'Nueva sugerencia en Alaia'),
      row('Categoría', feedback.category),
      row('Nombre', user.displayName),
      row('Email verificado', user.email),
      row('País', user.residenceCountryCode),
      row('Fecha', feedback.createdAt),
      row('Pantalla', feedback.page),
      row('URL', feedback.pageUrl),
      row('Trip ID', feedback.tripId),
      row('User ID', feedback.userId),
      row('Versión app', feedback.appVersion),
      row('Navegador', feedback.browser),
      row('Sistema operativo', feedback.os),
      row('Dispositivo', feedback.deviceType),
      h('hr', { style: { border: 0, borderTop: `1px solid ${theme.colors.border}`, margin: '20px 0' } }),
      h('p', { style: styles.text }, feedback.message),
    ),
  );
}
