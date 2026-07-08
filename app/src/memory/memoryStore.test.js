import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  memoriesKey,
  createNoteMemory,
  loadMemories,
  toggleFavorite,
  archiveMemory,
  promotePhotoUrl,
  replaceAllMemories,
} from './memoryStore.js';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
  };
}

test('memoriesKey namespacea por storyId', () => {
  assert.equal(memoriesKey('story-a'), 'aurora:memories:story-a');
  assert.notEqual(memoriesKey('story-a'), memoriesKey('story-b'));
});

test('createNoteMemory guarda todos los campos esperados', () => {
  const storage = fakeStorage();
  const memory = createNoteMemory('story-a', 'chapter-1', 'act-1', 'Una nota de prueba.', { storage });

  assert.equal(memory.storyId, 'story-a');
  assert.equal(memory.chapterId, 'chapter-1');
  assert.equal(memory.activityId, 'act-1');
  assert.equal(memory.note, 'Una nota de prueba.');
  assert.deepEqual(memory.photos, []);
  assert.deepEqual(memory.videos, []);
  assert.equal(memory.favorite, false);
  assert.equal(memory.archived, false);
  assert.equal(typeof memory.id, 'string');
  assert.ok(memory.id.length > 0);
  assert.equal(typeof memory.createdAt, 'string');
});

test('createNoteMemory sin activityId lo guarda como null', () => {
  const storage = fakeStorage();
  const memory = createNoteMemory('story-a', 'chapter-1', null, 'Sin actividad asociada.', { storage });
  assert.equal(memory.activityId, null);
});

test('loadMemories hace round-trip con varias Memorias', () => {
  const storage = fakeStorage();
  createNoteMemory('story-a', 'chapter-1', null, 'Primera.', { storage });
  createNoteMemory('story-a', 'chapter-2', null, 'Segunda.', { storage });
  const memories = loadMemories('story-a', storage);
  assert.equal(memories.length, 2);
  assert.deepEqual(memories.map((m) => m.note), ['Primera.', 'Segunda.']);
});

test('dos storyId distintos no se pisan entre sí', () => {
  const storage = fakeStorage();
  createNoteMemory('story-a', 'chapter-1', null, 'De la historia A.', { storage });
  createNoteMemory('story-b', 'chapter-1', null, 'De la historia B.', { storage });
  assert.equal(loadMemories('story-a', storage).length, 1);
  assert.equal(loadMemories('story-b', storage).length, 1);
  assert.equal(loadMemories('story-a', storage)[0].note, 'De la historia A.');
});

test('toggleFavorite cambia de false a true y de vuelta a false', () => {
  const storage = fakeStorage();
  const memory = createNoteMemory('story-a', 'chapter-1', null, 'Una nota.', { storage });

  const favorited = toggleFavorite('story-a', memory.id, storage);
  assert.equal(favorited.favorite, true);

  const unfavorited = toggleFavorite('story-a', memory.id, storage);
  assert.equal(unfavorited.favorite, false);
});

test('archiveMemory marca archived sin eliminarla, y loadMemories la oculta por defecto', () => {
  const storage = fakeStorage();
  const memory = createNoteMemory('story-a', 'chapter-1', null, 'Una nota archivable.', { storage });
  archiveMemory('story-a', memory.id, storage);

  assert.equal(loadMemories('story-a', storage).length, 0);

  const withArchived = loadMemories('story-a', storage, { includeArchived: true });
  assert.equal(withArchived.length, 1);
  assert.equal(withArchived[0].archived, true);
});

test('toggleFavorite y archiveMemory sobre un id inexistente no rompen', () => {
  const storage = fakeStorage();
  createNoteMemory('story-a', 'chapter-1', null, 'Una nota.', { storage });
  assert.equal(toggleFavorite('story-a', 'no-existe', storage), null);
  assert.equal(archiveMemory('story-a', 'no-existe', storage), null);
});

test('loadMemories tolera JSON corrupto y devuelve []', () => {
  const storage = fakeStorage();
  storage.setItem(memoriesKey('story-a'), '{ esto no es json');
  assert.deepEqual(loadMemories('story-a', storage), []);
});

test('Épica 3: createNoteMemory guarda las fotos recibidas, con la primera como principal', () => {
  const storage = fakeStorage();
  const memory = createNoteMemory('story-a', 'chapter-1', 'act-1', 'Con fotos.', {
    photos: ['photo-1', 'photo-2'],
    storage,
  });
  assert.deepEqual(memory.photos, ['photo-1', 'photo-2']);
});

test('Épica 3: createNoteMemory sin fotos sigue guardando photos: [] (compatibilidad)', () => {
  const storage = fakeStorage();
  const memory = createNoteMemory('story-a', 'chapter-1', 'act-1', 'Sin fotos.', { storage });
  assert.deepEqual(memory.photos, []);
});

test('Épica 2: si el storage no acepta escrituras (privado, cuota llena), createNoteMemory no rompe', () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  assert.doesNotThrow(() => createNoteMemory('story-a', 'chapter-1', null, 'Una nota.', { storage }));
});

test('Épica 5: createNoteMemory guarda updatedAt igual a createdAt al crearse', () => {
  const storage = fakeStorage();
  const memory = createNoteMemory('story-a', 'chapter-1', null, 'Una nota.', { storage });
  assert.equal(memory.updatedAt, memory.createdAt);
});

test('Épica 5: toggleFavorite y archiveMemory actualizan updatedAt', () => {
  const storage = fakeStorage();
  const memory = createNoteMemory('story-a', 'chapter-1', null, 'Una nota.', { storage });
  const favorited = toggleFavorite('story-a', memory.id, storage);
  assert.ok(favorited.updatedAt >= memory.updatedAt);
  const archived = archiveMemory('story-a', memory.id, storage);
  assert.ok(archived.updatedAt >= favorited.updatedAt);
});

test('Épica 5: promotePhotoUrl reemplaza el id local por la URL remota, sin tocar updatedAt', () => {
  const storage = fakeStorage();
  const memory = createNoteMemory('story-a', 'chapter-1', 'act-1', 'Con foto.', { photos: ['local-1'], storage });
  promotePhotoUrl('story-a', memory.id, 'local-1', 'https://cloudinary.example/foo.jpg', storage);
  const [updated] = loadMemories('story-a', storage);
  assert.deepEqual(updated.photos, ['https://cloudinary.example/foo.jpg']);
  assert.equal(updated.updatedAt, memory.updatedAt);
});

test('Épica 5: replaceAllMemories sobreescribe todo con el resultado de la fusión del servidor', () => {
  const storage = fakeStorage();
  createNoteMemory('story-a', 'chapter-1', null, 'Se va a reemplazar.', { storage });
  const fused = [{ id: 'mem-remota', storyId: 'story-a', chapterId: 'chapter-1', note: 'Fusionada.', photos: [], favorite: false, archived: false, createdAt: '2027-01-01T00:00:00Z', updatedAt: '2027-01-01T00:00:00Z' }];
  replaceAllMemories('story-a', fused, storage);
  assert.deepEqual(loadMemories('story-a', storage), fused);
});
