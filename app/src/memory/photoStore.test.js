// IndexedDB no existe en Node — se usa fake-indexeddb (solo en tests, nunca en
// código de producción) para poder probar photoStore.js con `node --test`.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { savePhotoBlob, loadPhotoBlob } from './photoStore.js';

test('savePhotoBlob + loadPhotoBlob hacen round-trip con el mismo Blob', async () => {
  const blob = new Blob(['contenido de prueba'], { type: 'image/jpeg' });
  const id = await savePhotoBlob(blob);
  assert.equal(typeof id, 'string');
  assert.ok(id.length > 0);

  const loaded = await loadPhotoBlob(id);
  assert.equal(loaded.type, 'image/jpeg');
  assert.equal(loaded.size, blob.size);
});

test('loadPhotoBlob con un id inexistente devuelve null', async () => {
  const loaded = await loadPhotoBlob('no-existe');
  assert.equal(loaded, null);
});

test('savePhotoBlob genera ids distintos para cada foto', async () => {
  const id1 = await savePhotoBlob(new Blob(['a']));
  const id2 = await savePhotoBlob(new Blob(['b']));
  assert.notEqual(id1, id2);
});
