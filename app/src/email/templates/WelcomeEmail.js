import { createElement as h } from 'react';
import { AuroraLayout } from '../layouts/AuroraLayout.js';
import { EmailCard } from '../components/EmailCard.js';
import { EmailButton } from '../components/EmailButton.js';
import { SectionTitle } from '../components/SectionTitle.js';
import { Spacer } from '../components/Spacer.js';
import { styles } from '../theme.js';

const DEFAULT_APP_URL = 'https://aurora.cl';

export function WelcomeEmail({ name = '', appUrl = DEFAULT_APP_URL } = {}) {
  return h(
    AuroraLayout,
    { previewText: `Bienvenido a Aurora${name ? `, ${name}` : ''}`, appUrl },
    h(
      EmailCard,
      null,
      h(SectionTitle, null, 'Bienvenido a Aurora'),
      h(
        'p',
        { style: styles.text },
        `Hola${name ? ` ${name}` : ''}, tu viaje está a punto de convertirse en algo que vas a recordar mucho después de volver.`,
      ),
      h(
        'p',
        { style: styles.text },
        'Aurora te acompaña en cada paso: guarda tus recuerdos, organiza tu itinerario y te muestra la ciudad de una forma distinta.',
      ),
      h(Spacer, { height: '8px' }),
      h(EmailButton, { href: appUrl }, 'Abrir Aurora'),
    ),
  );
}
