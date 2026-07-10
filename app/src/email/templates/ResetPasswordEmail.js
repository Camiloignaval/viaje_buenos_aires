import { createElement as h } from 'react';
import { AuroraLayout } from '../layouts/AuroraLayout.js';
import { EmailCard } from '../components/EmailCard.js';
import { EmailButton } from '../components/EmailButton.js';
import { SectionTitle } from '../components/SectionTitle.js';
import { Spacer } from '../components/Spacer.js';
import { styles } from '../theme.js';

const DEFAULT_APP_URL = 'https://aurora.cl';

export function ResetPasswordEmail({ name = '', resetUrl, appUrl = DEFAULT_APP_URL } = {}) {
  return h(
    AuroraLayout,
    { previewText: 'Elegí una nueva contraseña para Aurora', appUrl },
    h(
      EmailCard,
      null,
      h(SectionTitle, null, 'Cambiá tu contraseña'),
      h('p', { style: styles.text }, `Hola${name ? ` ${name}` : ''}, recibimos una solicitud para cambiar tu contraseña.`),
      h(Spacer, { height: '8px' }),
      h(EmailButton, { href: resetUrl }, 'Elegir nueva contraseña'),
      h(
        'p',
        { style: { ...styles.textMuted, marginTop: '24px' } },
        'Si no fuiste vos, ignorá este correo — tu contraseña actual sigue funcionando.',
      ),
    ),
  );
}
