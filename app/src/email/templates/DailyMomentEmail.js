import { createElement as h } from 'react';
import { AlaiaLayout } from '../layouts/AlaiaLayout.js';
import { EmailCard } from '../components/EmailCard.js';
import { EmailButton } from '../components/EmailButton.js';
import { SectionTitle } from '../components/SectionTitle.js';
import { Spacer } from '../components/Spacer.js';
import { theme, styles } from '../theme.js';

const DEFAULT_APP_URL = 'https://alaia.cl';

export function DailyMomentEmail({ name = '', memoryTitle, memoryText, imageUrl, appUrl = DEFAULT_APP_URL } = {}) {
  return h(
    AlaiaLayout,
    { previewText: memoryTitle ?? 'Un recuerdo de tu viaje te está esperando', appUrl },
    h(
      EmailCard,
      null,
      h(SectionTitle, null, memoryTitle ?? 'Un recuerdo de tu viaje'),
      h('p', { style: styles.text }, `Hola${name ? ` ${name}` : ''}, Alaia guardó este momento para vos.`),
      imageUrl
        ? h(
            'div',
            null,
            h(Spacer, { height: '16px' }),
            h('img', {
              src: imageUrl,
              alt: memoryTitle ?? 'Recuerdo',
              width: '100%',
              style: { display: 'block', borderRadius: theme.radius.md, maxWidth: '100%' },
            }),
          )
        : null,
      memoryText
        ? h('p', { style: { ...styles.text, fontStyle: 'italic', color: theme.colors.textSecondary } }, `“${memoryText}”`)
        : null,
      h(Spacer, { height: '8px' }),
      h(EmailButton, { href: appUrl }, 'Ver este recuerdo en Alaia'),
    ),
  );
}
