import { describe, it, expect } from "vitest";
import {
  deleteNote,
  getNote,
  loadNotes,
  NOTE_MAX_LENGTH,
  saveNote,
  type KeyValueStorage,
} from "./notesStore";

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

describe("notesStore", () => {
  it("crea y lee una nota", () => {
    const s = memoryStorage();
    saveNote("trip-1", "cuartito", "Prometimos volver.", s);
    expect(getNote("trip-1", "cuartito", s)?.text).toBe("Prometimos volver.");
  });

  it("edita una nota conservando createdAt", () => {
    const s = memoryStorage();
    saveNote("trip-1", "cuartito", "Primera versión.", s);
    const created = getNote("trip-1", "cuartito", s)!.createdAt;
    saveNote("trip-1", "cuartito", "Versión editada.", s);
    const note = getNote("trip-1", "cuartito", s)!;
    expect(note.text).toBe("Versión editada.");
    expect(note.createdAt).toBe(created);
  });

  it("guardar texto vacío elimina la nota (sin notas fantasma)", () => {
    const s = memoryStorage();
    saveNote("trip-1", "cuartito", "algo", s);
    saveNote("trip-1", "cuartito", "   ", s);
    expect(getNote("trip-1", "cuartito", s)).toBeNull();
  });

  it("elimina explícitamente una nota", () => {
    const s = memoryStorage();
    saveNote("trip-1", "cuartito", "algo", s);
    deleteNote("trip-1", "cuartito", s);
    expect(getNote("trip-1", "cuartito", s)).toBeNull();
  });

  it("aplica el límite de longitud documentado", () => {
    const s = memoryStorage();
    saveNote("trip-1", "cuartito", "a".repeat(NOTE_MAX_LENGTH + 500), s);
    expect(getNote("trip-1", "cuartito", s)!.text).toHaveLength(NOTE_MAX_LENGTH);
  });

  it("admite múltiples notas y no las mezcla entre viajes", () => {
    const s = memoryStorage();
    saveNote("trip-1", "cuartito", "uno", s);
    saveNote("trip-1", "la-biela", "dos", s);
    saveNote("trip-2", "cuartito", "otro viaje", s);
    expect(Object.keys(loadNotes("trip-1", s))).toHaveLength(2);
    expect(getNote("trip-2", "cuartito", s)?.text).toBe("otro viaje");
  });

  it("reescribir la misma nota nunca la duplica", () => {
    const s = memoryStorage();
    saveNote("trip-1", "cuartito", "a", s);
    saveNote("trip-1", "cuartito", "b", s);
    expect(Object.keys(loadNotes("trip-1", s))).toHaveLength(1);
  });

  it("persiste y sobrevive una recarga", () => {
    const s = memoryStorage();
    saveNote("trip-1", "dia-1", "El día que llovía.", s);
    expect(loadNotes("trip-1", s)["dia-1"].text).toBe("El día que llovía.");
  });
});
