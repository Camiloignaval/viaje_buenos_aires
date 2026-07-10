import { createElement as h } from 'react';

export function Spacer({ height = '24px' }) {
  return h('div', { style: { height, lineHeight: height, fontSize: 0 } }, ' ');
}
