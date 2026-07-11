import { createElement as h } from 'react';
import { AuroraLayout } from '../layouts/AuroraLayout.js';
import { EmailCard } from '../components/EmailCard.js';
import { EmailButton } from '../components/EmailButton.js';
import { SectionTitle } from '../components/SectionTitle.js';
import { Spacer } from '../components/Spacer.js';
import { styles } from '../theme.js';

export function FeedbackReceivedEmail({ name = '', appUrl = '' } = {}) {
  return h(
    AuroraLayout,
    { previewText: 'Gracias por ayudarnos a mejorar Alaia', appUrl },
    h(
      EmailCard,
      null,
      h(SectionTitle, null, 'Recibimos tu mensaje'),
      h(
        'p',
        { style: styles.text },
        `Gracias${name ? `, ${name}` : ''} por tomarte un momento para escribirnos. Cada detalle puede ayudarnos a hacer de Alaia una mejor compañía de viaje.`,
      ),
      h('p', { style: styles.text }, 'Leeremos tu mensaje con atención.'),
      appUrl ? h(Spacer, { height: '8px' }) : null,
      appUrl ? h(EmailButton, { href: appUrl }, 'Abrir Alaia') : null,
    ),
  );
}
