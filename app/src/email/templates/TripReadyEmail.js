import { createElement as h } from 'react';
import { AlaiaLayout } from '../layouts/AlaiaLayout.js';
import { EmailCard } from '../components/EmailCard.js';
import { EmailButton } from '../components/EmailButton.js';
import { SectionTitle } from '../components/SectionTitle.js';
import { Divider } from '../components/Divider.js';
import { Spacer } from '../components/Spacer.js';
import { theme, styles } from '../theme.js';

const DEFAULT_APP_URL = 'https://Alaia.cl';

function formatDateRange(startDate, endDate) {
  if (!startDate) return '';
  const format = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (!match) return '';
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  };
  if (!endDate || endDate === startDate) return format(startDate);
  return `${format(startDate)} â€“ ${format(endDate)}`;
}

export function TripReadyEmail({ name = '', destination, startDate, endDate, tripUrl, appUrl = DEFAULT_APP_URL } = {}) {
  const dateRange = formatDateRange(startDate, endDate);

  return h(
    AlaiaLayout,
    { previewText: `Tu viaje a ${destination} ya estÃ¡ listo`, appUrl },
    h(
      EmailCard,
      null,
      h(SectionTitle, null, 'Tu viaje ya estÃ¡ listo'),
      h('p', { style: styles.text }, `Hola${name ? ` ${name}` : ''}, terminamos de armar tu experiencia en Alaia.`),
      h(Divider),
      h('p', { style: { margin: 0, fontSize: '20px', fontWeight: 600, color: theme.colors.textPrimary } }, destination),
      dateRange ? h('p', { style: { ...styles.textMuted, margin: '4px 0 0' } }, dateRange) : null,
      h(Spacer, { height: '16px' }),
      h(EmailButton, { href: tripUrl ?? appUrl }, 'Abrir Alaia'),
    ),
  );
}
