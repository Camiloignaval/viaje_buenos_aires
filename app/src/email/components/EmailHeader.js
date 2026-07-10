import { createElement as h } from 'react';
import { theme } from '../theme.js';

export function EmailHeader({ logoUrl } = {}) {
  return h(
    'div',
    { style: { textAlign: 'center', marginBottom: theme.spacing.lg } },
    logoUrl
      ? h('img', {
          src: logoUrl,
          alt: 'Aurora',
          width: 40,
          height: 40,
          style: { display: 'block', margin: '0 auto' },
        })
      : h(
          'span',
          {
            style: {
              fontFamily: theme.font.sans,
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: theme.colors.primary,
            },
          },
          'Aurora',
        ),
  );
}
