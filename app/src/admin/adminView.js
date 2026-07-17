// Herramienta interna: valida/exporta. El catálogo se modifica en código de contenido.
import { loadStoryPackage, StoryPackageValidationError } from '../story/storyPackage/storyPackage.js';

const fileInput = document.getElementById('file-input');
const jsonInput = document.getElementById('json-input');
const validateButton = document.getElementById('publish-button');
const errorMessage = document.getElementById('error-message');
const resultEl = document.getElementById('result');
const fileNameOutput = document.getElementById('link-output');
const downloadButton = document.getElementById('copy-button');
let validatedJson = '';

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (file) jsonInput.value = await file.text();
});

function showError(message) {
  errorMessage.textContent = message;
  resultEl.classList.remove('visible');
}

validateButton.addEventListener('click', () => {
  errorMessage.textContent = '';
  resultEl.classList.remove('visible');
  try {
    const storyPackage = loadStoryPackage(JSON.parse(jsonInput.value));
    validatedJson = `${JSON.stringify(storyPackage, null, 2)}\n`;
    fileNameOutput.value = `${storyPackage.storyId}.json`;
    resultEl.classList.add('visible');
  } catch (error) {
    if (error instanceof SyntaxError) return showError('El JSON no es válido — revisá que esté completo y bien formado.');
    if (error instanceof StoryPackageValidationError) return showError(error.message);
    throw error;
  }
});

downloadButton.addEventListener('click', () => {
  if (!validatedJson) return;
  const url = URL.createObjectURL(new Blob([validatedJson], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileNameOutput.value;
  anchor.click();
  URL.revokeObjectURL(url);
});
