import { createElement as h } from 'react';
import { AlaiaLayout } from '../layouts/AlaiaLayout.js';
import { EmailCard } from '../components/EmailCard.js';
import { EmailButton } from '../components/EmailButton.js';
import { SectionTitle } from '../components/SectionTitle.js';
import { Spacer } from '../components/Spacer.js';
import { styles } from '../theme.js';

const DEFAULT_APP_URL = 'https://Alaia.cl';

export function WelcomeEmail({ name = '', appUrl = DEFAULT_APP_URL } = {}) {
  return h(
    AlaiaLayout,
    { previewText: `Bienvenido a Alaia${name ? `, ${name}` : ''}`, appUrl },
    h(
      EmailCard,
      null,
      h(SectionTitle, null, 'Bienvenido a Alaia'),
      h(
        'p',
        { style: styles.text },
        `Hola${name ? ` ${name}` : ''}, tu viaje estÃ¡ a punto de convertirse en algo que vas a recordar mucho despuÃ©s de volver.`,
      ),
      h(
        'p',
        { style: styles.text },
        'Alaia te acompaÃ±a en cada paso: guarda tus recuerdos, organiza tu itinerario y te muestra la ciudad de una forma distinta.',
      ),
      h(Spacer, { height: '8px' }),
      h(EmailButton, { href: appUrl }, 'Abrir Alaia'),
    ),
  );
}
