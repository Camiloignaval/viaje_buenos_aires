import assert from 'node:assert/strict';
import test from 'node:test';

test('importar mongodb.js no revienta aunque falte MONGODB_URI (chequeo lazy, no a nivel de módulo)', async () => {
  const previous = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  try {
    const { getDb } = await import(`./mongodb.js?t=${Date.now()}`);
    await assert.rejects(() => getDb(), /Falta la variable de entorno MONGODB_URI/);
  } finally {
    if (previous === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = previous;
    }
  }
});
