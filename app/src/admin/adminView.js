// Conecta los controles de admin.html con /api/aurora/story (Épica 5). Como
// debugView.js/memoriesView.js: herramienta interna, no UI de producto.
// Valida el Story Package con la MISMA función que usa el motor real —
// no duplica reglas de validación acá.

import QRCode from 'qrcode';
import { loadStoryPackage, StoryPackageValidationError } from '../story/storyPackage/storyPackage.js';

const passwordInput = document.getElementById('password-input');
const fileInput = document.getElementById('file-input');
const jsonInput = document.getElementById('json-input');
const publishButton = document.getElementById('publish-button');
const errorMessage = document.getElementById('error-message');
const resultEl = document.getElementById('result');
const linkOutput = document.getElementById('link-output');
const copyButton = document.getElementById('copy-button');
const qrEl = document.getElementById('qr');

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    return;
  }
  jsonInput.value = await file.text();
});

function showError(message) {
  errorMessage.textContent = message;
  resultEl.classList.remove('visible');
}

publishButton.addEventListener('click', async () => {
  errorMessage.textContent = '';
  resultEl.classList.remove('visible');

  let rawStoryPackage;
  try {
    rawStoryPackage = JSON.parse(jsonInput.value);
  } catch {
    showError('El JSON no es válido — revisá que esté completo y bien formado.');
    return;
  }

  try {
    loadStoryPackage(rawStoryPackage);
  } catch (err) {
    if (err instanceof StoryPackageValidationError) {
      showError(`Story Package inválido: ${err.message}`);
      return;
    }
    throw err;
  }

  publishButton.disabled = true;
  publishButton.textContent = 'Publicando...';
  try {
    const response = await fetch('/api/aurora/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value, storyPackage: rawStoryPackage }),
    });
    const body = await response.json();
    if (!response.ok) {
      showError(body.error ?? 'No se pudo publicar.');
      return;
    }

    const link = `${window.location.origin}/experience?token=${body.accessToken}`;
    linkOutput.value = link;
    resultEl.classList.add('visible');
    qrEl.innerHTML = '';
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, link, { width: 220 });
    qrEl.appendChild(canvas);
  } catch (err) {
    showError(`No se pudo conectar con el backend: ${err.message}`);
  } finally {
    publishButton.disabled = false;
    publishButton.textContent = 'Publicar';
  }
});

copyButton.addEventListener('click', async () => {
  await navigator.clipboard.writeText(linkOutput.value);
  copyButton.textContent = 'Copiado';
  setTimeout(() => {
    copyButton.textContent = 'Copiar link';
  }, 1500);
});
