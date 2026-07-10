import { createElement } from 'react';
import { render } from '@react-email/render';

// Único punto donde un componente de src/email se convierte en HTML/texto.
// sendEmail.js no sabe nada de React — solo le pide a esta función el par
// { html, text } para un template + props dados.
export async function renderTemplate(template, props = {}) {
  const element = createElement(template, props);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text };
}
