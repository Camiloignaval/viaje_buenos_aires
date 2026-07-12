import { createElement as h } from 'react';
import { theme } from '../theme.js';

const DEFAULT_APP_URL = 'https://Alaia.cl';

export function EmailFooter({ appUrl = DEFAULT_APP_URL } = {}) {
  const year = new Date().getFullYear();
  const linkStyle = { color: theme.colors.textSecondary, textDecoration: 'underline' };

  return h(
    'div',
    { style: { marginTop: theme.spacing.xl, textAlign: 'center' } },
    h('hr', { style: { border: 'none', borderTop: `1px solid ${theme.colors.border}`, margin: `0 0 ${theme.spacing.md}` } }),
    h(
      'p',
      { style: { margin: 0, fontFamily: theme.font.sans, fontSize: '12px', lineHeight: '20px', color: theme.colors.textSecondary } },
      `© ${year} Alaia. Todos los derechos reservados.`,
    ),
    h(
      'p',
      { style: { margin: '4px 0 0', fontFamily: theme.font.sans, fontSize: '12px', lineHeight: '20px' } },
      h('a', { href: `${appUrl}/privacidad`, style: linkStyle }, 'Privacidad'),
      '  ·  ',
      h('a', { href: `${appUrl}/terminos`, style: linkStyle }, 'Términos'),
    ),
  );
}
