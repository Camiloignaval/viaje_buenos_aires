import { createElement as h } from 'react';
import { styles } from '../theme.js';
import { EmailHeader } from '../components/EmailHeader.js';
import { EmailFooter } from '../components/EmailFooter.js';

// Shell compartido por todos los templates: head + preview text oculto +
// contenedor de 600px + header/footer. Cambiar el diseño global de los
// emails empieza y termina en este archivo (y en theme.js para los tokens).
export function AlaiaLayout({ previewText = '', appUrl, logoUrl, children }) {
  return h(
    'html',
    { lang: 'es' },
    h(
      'head',
      null,
      h('meta', { charSet: 'utf-8' }),
      h('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }),
    ),
    h(
      'body',
      { style: styles.body },
      previewText
        ? h(
            'div',
            { style: { display: 'none', overflow: 'hidden', lineHeight: '1px', opacity: 0, maxHeight: 0, maxWidth: 0 } },
            previewText,
          )
        : null,
      h(
        'div',
        { style: styles.container },
        h(EmailHeader, { logoUrl }),
        children,
        h(EmailFooter, { appUrl }),
      ),
    ),
  );
}
