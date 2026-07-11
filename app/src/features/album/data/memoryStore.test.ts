import { describe, it, expect } from "vitest";
import {
  memoriesKey,
  createNoteMemory,
  loadMemories,
  toggleFavorite,
  archiveMemory,
  promotePhotoUrl,
  replaceAllMemories,
} from "./memoryStore";
import type { KeyValueStorage, Memory } from "./types";

function fakeStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("memoryStore", () => {
  it("memoriesKey namespacea por storyId", () => {
    expect(memoriesKey("story-a")).toBe("alaia:memories:story-a");
    expect(memoriesKey("story-a")).not.toBe(memoriesKey("story-b"));
  });

  it("createNoteMemory guarda todos los campos esperados", () => {
    const storage = fakeStorage();
    const memory = createNoteMemory("story-a", "chapter-1", "act-1", "Una nota de prueba.", { storage });
    expect(memory.storyId).toBe("story-a");
    expect(memory.chapterId).toBe("chapter-1");
    expect(memory.activityId).toBe("act-1");
    expect(memory.note).toBe("Una nota de prueba.");
    expect(memory.photos).toEqual([]);
    expect(memory.videos).toEqual([]);
    expect(memory.favorite).toBe(false);
    expect(memory.archived).toBe(false);
    expect(typeof memory.id).toBe("string");
    expect(memory.id.length).toBeGreaterThan(0);
    expect(typeof memory.createdAt).toBe("string");
  });

  it("createNoteMemory sin activityId lo guarda como null", () => {
    const storage = fakeStorage();
    const memory = createNoteMemory("story-a", "chapter-1", null, "Sin actividad.", { storage });
    expect(memory.activityId).toBe(null);
  });

  it("loadMemories hace round-trip con varias Memorias", () => {
    const storage = fakeStorage();
    createNoteMemory("story-a", "chapter-1", null, "Primera.", { storage });
    createNoteMemory("story-a", "chapter-2", null, "Segunda.", { storage });
    const memories = loadMemories("story-a", storage);
    expect(memories.length).toBe(2);
    expect(memories.map((m) => m.note)).toEqual(["Primera.", "Segunda."]);
  });

  it("dos storyId distintos no se pisan entre sí", () => {
    const storage = fakeStorage();
    createNoteMemory("story-a", "chapter-1", null, "De la historia A.", { storage });
    createNoteMemory("story-b", "chapter-1", null, "De la historia B.", { storage });
    expect(loadMemories("story-a", storage).length).toBe(1);
    expect(loadMemories("story-b", storage).length).toBe(1);
    expect(loadMemories("story-a", storage)[0].note).toBe("De la historia A.");
  });

  it("toggleFavorite cambia de false a true y de vuelta a false", () => {
    const storage = fakeStorage();
    const memory = createNoteMemory("story-a", "chapter-1", null, "Una nota.", { storage });
    expect(toggleFavorite("story-a", memory.id, storage)?.favorite).toBe(true);
    expect(toggleFavorite("story-a", memory.id, storage)?.favorite).toBe(false);
  });

  it("archiveMemory marca archived sin eliminarla, y loadMemories la oculta por defecto", () => {
    const storage = fakeStorage();
    const memory = createNoteMemory("story-a", "chapter-1", null, "Una nota archivable.", { storage });
    archiveMemory("story-a", memory.id, storage);
    expect(loadMemories("story-a", storage).length).toBe(0);
    const withArchived = loadMemories("story-a", storage, { includeArchived: true });
    expect(withArchived.length).toBe(1);
    expect(withArchived[0].archived).toBe(true);
  });

  it("toggleFavorite y archiveMemory sobre un id inexistente no rompen", () => {
    const storage = fakeStorage();
    createNoteMemory("story-a", "chapter-1", null, "Una nota.", { storage });
    expect(toggleFavorite("story-a", "no-existe", storage)).toBe(null);
    expect(archiveMemory("story-a", "no-existe", storage)).toBe(null);
  });

  it("loadMemories tolera JSON corrupto y devuelve []", () => {
    const storage = fakeStorage();
    storage.setItem(memoriesKey("story-a"), "{ esto no es json");
    expect(loadMemories("story-a", storage)).toEqual([]);
  });

  it("Épica 3: createNoteMemory guarda las fotos recibidas, con la primera como principal", () => {
    const storage = fakeStorage();
    const memory = createNoteMemory("story-a", "chapter-1", "act-1", "Con fotos.", {
      photos: ["photo-1", "photo-2"],
      storage,
    });
    expect(memory.photos).toEqual(["photo-1", "photo-2"]);
  });

  it("Épica 2: si el storage no acepta escrituras, createNoteMemory no rompe", () => {
    const storage: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => createNoteMemory("story-a", "chapter-1", null, "Una nota.", { storage })).not.toThrow();
  });

  it("Épica 5: createNoteMemory guarda updatedAt igual a createdAt al crearse", () => {
    const storage = fakeStorage();
    const memory = createNoteMemory("story-a", "chapter-1", null, "Una nota.", { storage });
    expect(memory.updatedAt).toBe(memory.createdAt);
  });

  it("Épica 5: toggleFavorite y archiveMemory actualizan updatedAt", () => {
    const storage = fakeStorage();
    const memory = createNoteMemory("story-a", "chapter-1", null, "Una nota.", { storage });
    const favorited = toggleFavorite("story-a", memory.id, storage) as Memory;
    expect(favorited.updatedAt >= memory.updatedAt).toBe(true);
    const archived = archiveMemory("story-a", memory.id, storage) as Memory;
    expect(archived.updatedAt >= favorited.updatedAt).toBe(true);
  });

  it("Épica 5: promotePhotoUrl reemplaza el id local por la URL remota, sin tocar updatedAt", () => {
    const storage = fakeStorage();
    const memory = createNoteMemory("story-a", "chapter-1", "act-1", "Con foto.", {
      photos: ["local-1"],
      storage,
    });
    promotePhotoUrl("story-a", memory.id, "local-1", "https://cloudinary.example/foo.jpg", storage);
    const [updated] = loadMemories("story-a", storage);
    expect(updated.photos).toEqual(["https://cloudinary.example/foo.jpg"]);
    expect(updated.updatedAt).toBe(memory.updatedAt);
  });

  it("Épica 5: replaceAllMemories sobreescribe todo con el resultado de la fusión", () => {
    const storage = fakeStorage();
    createNoteMemory("story-a", "chapter-1", null, "Se va a reemplazar.", { storage });
    const fused: Memory[] = [
      {
        id: "mem-remota",
        storyId: "story-a",
        chapterId: "chapter-1",
        activityId: null,
        note: "Fusionada.",
        photos: [],
        videos: [],
        favorite: false,
        archived: false,
        createdAt: "2027-01-01T00:00:00Z",
        updatedAt: "2027-01-01T00:00:00Z",
      },
    ];
    replaceAllMemories("story-a", fused, storage);
    expect(loadMemories("story-a", storage)).toEqual(fused);
  });
});
