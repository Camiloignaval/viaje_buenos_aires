import { createElement as h } from 'react';
import { AuroraLayout } from '../layouts/AuroraLayout.js';
import { EmailCard } from '../components/EmailCard.js';
import { EmailButton } from '../components/EmailButton.js';
import { SectionTitle } from '../components/SectionTitle.js';
import { Spacer } from '../components/Spacer.js';
import { theme, styles } from '../theme.js';

const DEFAULT_APP_URL = 'https://Alaia.cl';

// Soporta cÃ³digo, botÃ³n, o ambos â€” quien llama a sendVerifyEmail decide
// quÃ© mecanismo de verificaciÃ³n usar sin tocar este template.
export function VerifyEmail({ name = '', code, verifyUrl, appUrl = DEFAULT_APP_URL } = {}) {
  return h(
    AuroraLayout,
    { previewText: 'ConfirmÃ¡ tu correo para seguir con Alaia', appUrl },
    h(
      EmailCard,
      null,
      h(SectionTitle, null, 'ConfirmÃ¡ tu correo'),
      h(
        'p',
        { style: styles.text },
        `Hola${name ? ` ${name}` : ''}, usÃ¡ este cÃ³digo para verificar tu correo. Vence en 10 minutos.`,
      ),
      code
        ? h(
            'p',
            {
              style: {
                margin: `${theme.spacing.md} 0`,
                textAlign: 'center',
                fontSize: '32px',
                fontWeight: 700,
                letterSpacing: '8px',
                color: theme.colors.primary,
              },
            },
            code,
          )
        : null,
      verifyUrl
        ? h('div', null, h(Spacer, { height: '8px' }), h(EmailButton, { href: verifyUrl }, 'Verificar mi correo'))
        : null,
    ),
  );
}
