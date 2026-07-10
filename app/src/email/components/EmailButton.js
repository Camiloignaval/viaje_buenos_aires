import { createElement as h } from 'react';
import { theme } from '../theme.js';

export function EmailButton({ href, children }) {
  return h(
    'table',
    { role: 'presentation', cellPadding: 0, cellSpacing: 0, border: 0, style: { margin: `${theme.spacing.md} 0` } },
    h(
      'tbody',
      null,
      h(
        'tr',
        null,
        h(
          'td',
          { style: { borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary } },
          h(
            'a',
            {
              href,
              target: '_blank',
              rel: 'noreferrer',
              style: {
                display: 'inline-block',
                padding: '14px 28px',
                fontFamily: theme.font.sans,
                fontSize: '15px',
                fontWeight: 600,
                color: theme.colors.white,
                textDecoration: 'none',
                borderRadius: theme.radius.pill,
              },
            },
            children,
          ),
        ),
      ),
    ),
  );
}
