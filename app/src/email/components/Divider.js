import { createElement as h } from 'react';
import { theme } from '../theme.js';

export function Divider() {
  return h('hr', {
    style: { border: 'none', borderTop: `1px solid ${theme.colors.border}`, margin: `${theme.spacing.lg} 0` },
  });
}
