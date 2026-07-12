import { createElement as h } from 'react';
import { theme } from '../theme.js';

export function SectionTitle({ children }) {
  return h(
    'h1',
    {
      style: {
        margin: 0,
        fontFamily: theme.font.sans,
        fontSize: '24px',
        lineHeight: '32px',
        fontWeight: 600,
        color: theme.colors.textPrimary,
      },
    },
    children,
  );
}
