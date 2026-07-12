import { createElement as h } from 'react';
import { theme } from '../theme.js';

export function EmailCard({ children }) {
  return h(
    'div',
    {
      style: {
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
      },
    },
    children,
  );
}
