import { createElement as h } from 'react';
import { AlaiaLayout } from '../layouts/AlaiaLayout.js';
import { EmailCard } from '../components/EmailCard.js';
import { EmailButton } from '../components/EmailButton.js';
import { SectionTitle } from '../components/SectionTitle.js';
import { Spacer } from '../components/Spacer.js';
import { styles } from '../theme.js';

const DEFAULT_APP_URL = 'https://Alaia.cl';

export function ResetPasswordEmail({ name = '', resetUrl, appUrl = DEFAULT_APP_URL } = {}) {
  return h(
    AlaiaLayout,
    { previewText: 'ElegÃ­ una nueva contraseÃ±a para Alaia', appUrl },
    h(
      EmailCard,
      null,
      h(SectionTitle, null, 'CambiÃ¡ tu contraseÃ±a'),
      h('p', { style: styles.text }, `Hola${name ? ` ${name}` : ''}, recibimos una solicitud para cambiar tu contraseÃ±a.`),
      h(Spacer, { height: '8px' }),
      h(EmailButton, { href: resetUrl }, 'Elegir nueva contraseÃ±a'),
      h(
        'p',
        { style: { ...styles.textMuted, marginTop: '24px' } },
        'Si no fuiste vos, ignorÃ¡ este correo â€” tu contraseÃ±a actual sigue funcionando.',
      ),
    ),
  );
}
