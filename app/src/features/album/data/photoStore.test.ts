// @vitest-environment node
//
// Entorno `node` (no jsdom) para este archivo: photoStore no toca el DOM y, bajo
// jsdom, el structured-clone de fake-indexeddb no preserva el `.type` del Blob de
// jsdom. En node — igual que el viejo `node --test` — el round-trip es fiel.
// IndexedDB no existe en Node: fake-indexeddb lo provee (import con efecto).
import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { savePhotoBlob, loadPhotoBlob } from "./photoStore";

describe("photoStore", () => {
  it("savePhotoBlob + loadPhotoBlob hacen round-trip con el mismo Blob", async () => {
    const blob = new Blob(["contenido de prueba"], { type: "image/jpeg" });
    const id = await savePhotoBlob(blob);
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);

    const loaded = await loadPhotoBlob(id);
    expect(loaded?.type).toBe("image/jpeg");
    expect(loaded?.size).toBe(blob.size);
  });

  it("loadPhotoBlob con un id inexistente devuelve null", async () => {
    const loaded = await loadPhotoBlob("no-existe");
    expect(loaded).toBe(null);
  });

  it("savePhotoBlob genera ids distintos para cada foto", async () => {
    const id1 = await savePhotoBlob(new Blob(["a"]));
    const id2 = await savePhotoBlob(new Blob(["b"]));
    expect(id1).not.toBe(id2);
  });
});
