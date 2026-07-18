// Cubre el hotfix de fuga de UUID y "una foto es compartida solo con URL remota".
// Usa memoryStore/progressStore reales (localStorage de jsdom) y solo mockea la red
// (`fetch`) y `loadPhotoBlob` — este último porque fake-indexeddb bajo jsdom no
// preserva un Blob apto para FileReader (mismo motivo que photoStore.test usa node).
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  isRemotePhotoUrl,
  sanitizeMemoriesForRemoteSync,
  reattachPendingPhotos,
  saveSyncToken,
  syncNow,
} from "./syncClient";
import { loadPhotoStatuses } from "./uploadStatusStore";
import { createNoteMemory, loadMemories } from "@/features/album/data/memoryStore";
import type { Memory } from "@/features/album/data/types";

vi.mock("@/features/album/data/photoStore", () => ({
  // Devuelve un Blob real de jsdom (FileReader lo acepta). null ⇒ id sin bytes.
  loadPhotoBlob: vi.fn(async (id: string) =>
    id === "no-blob" ? null : new Blob(["img"], { type: "image/jpeg" }),
  ),
}));

const STORY = "story-abc";
const TOKEN = "token-xyz";
const LOCAL_ID = "550e8400-e29b-41d4-a716-446655440000";
const REMOTE = "https://res.cloudinary.com/dc6vako2z/image/upload/alaia/story-abc/foo.jpg";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `HTTP ${status}`,
    json: async () => body,
    clone() {
      return this as Response;
    },
  } as unknown as Response;
}

/** fetch mock que responde según el endpoint. */
function mockFetch(handlers: {
  photoUpload: () => Response | Promise<Response>;
  sync?: (payload: { memories: Memory[] }) => Response;
}) {
  const syncBodies: { memories: Memory[] }[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/alaia/photo-upload") return handlers.photoUpload();
    if (url === "/api/alaia/sync") {
      const payload = JSON.parse(String(init?.body)) as { memories: Memory[] };
      syncBodies.push(payload);
      // Por defecto el servidor devuelve tal cual lo que recibe (sin otro dispositivo).
      return handlers.sync ? handlers.sync(payload) : jsonResponse(200, {
        chapterStatuses: {},
        memories: payload.memories,
      });
    }
    throw new Error(`endpoint no mockeado: ${url}`);
  });
  vi.stubGlobal("fetch", fn);
  return { fn, syncBodies };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isRemotePhotoUrl", () => {
  it("acepta solo URLs https; rechaza UUID, blob: y http:", () => {
    expect(isRemotePhotoUrl(REMOTE)).toBe(true);
    expect(isRemotePhotoUrl("blob:http://localhost/abc")).toBe(false);
    expect(isRemotePhotoUrl("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
    expect(isRemotePhotoUrl("http://inseguro/x.jpg")).toBe(false);
    expect(isRemotePhotoUrl(null)).toBe(false);
  });
});

describe("sanitizeMemoriesForRemoteSync (Caso F)", () => {
  it("deja en el payload solo URLs remotas; descarta UUID y blob:", () => {
    const memories = [
      { id: "m1", photos: [REMOTE, "uuid-local", "blob:xyz"] } as unknown as Memory,
    ];
    const sanitized = sanitizeMemoriesForRemoteSync(memories);
    expect(sanitized[0].photos).toEqual([REMOTE]);
    // no muta el original
    expect(memories[0].photos).toEqual([REMOTE, "uuid-local", "blob:xyz"]);
  });
});

describe("reattachPendingPhotos", () => {
  it("reincorpora los UUID locales pendientes al resultado del servidor", () => {
    const merged = [{ id: "m1", photos: [REMOTE] } as unknown as Memory];
    const local = [{ id: "m1", photos: [REMOTE, "uuid-pendiente"] } as unknown as Memory];
    const result = reattachPendingPhotos(merged, local);
    expect(result[0].photos).toEqual([REMOTE, "uuid-pendiente"]);
  });
});

describe("syncNow — Caso A (éxito)", () => {
  it("sube, promueve el UUID a URL y sincroniza SOLO la URL remota", async () => {
    saveSyncToken(STORY, TOKEN);
    const localId = LOCAL_ID;
    createNoteMemory(STORY, "chapter-1", null, "nota", { photos: [localId] });

    const { fn, syncBodies } = mockFetch({
      photoUpload: () => jsonResponse(200, { url: REMOTE, publicId: "alaia/story-abc/foo" }),
    });

    const result = await syncNow(STORY);

    // upload real invocado con la imagen como data URL
    const uploadCall = fn.mock.calls.find(([url]) => url === "/api/alaia/photo-upload");
    expect(JSON.parse(String(uploadCall?.[1]?.body)).image).toMatch(/^data:image\//);

    // el UUID local fue promovido a URL en el estado local
    expect(loadMemories(STORY, undefined, { includeArchived: true })[0].photos).toEqual([REMOTE]);
    // al backend viajó SOLO la URL remota
    expect(syncBodies[0].memories[0].photos).toEqual([REMOTE]);
    expect(result?.photoOutcomes).toEqual([
      expect.objectContaining({ status: "uploaded", url: REMOTE }),
    ]);
  });
});

describe("syncNow — Caso B (Cloudinary 503) y Caso F (payload remoto)", () => {
  it("NO envía el UUID, conserva el Blob local y marca failed", async () => {
    saveSyncToken(STORY, TOKEN);
    const localId = LOCAL_ID;
    createNoteMemory(STORY, "chapter-1", null, "nota", { photos: [localId] });

    const { syncBodies } = mockFetch({
      photoUpload: () => jsonResponse(503, { error: "sin cloudinary", code: "cloudinary_not_configured" }),
    });

    const result = await syncNow(STORY);

    // el UUID sigue en el estado local (no se pierde la foto)
    expect(loadMemories(STORY, undefined, { includeArchived: true })[0].photos).toEqual([localId]);
    // NINGÚN UUID viajó al backend
    expect(syncBodies[0].memories[0].photos).toEqual([]);
    // estado failed persistido y reintentable
    expect(loadPhotoStatuses(STORY)[localId]).toBe("failed");
    expect(result?.photoOutcomes[0]).toMatchObject({ status: "failed" });
  });
});

describe("syncNow — Caso G (403 token/permiso)", () => {
  it("no marca como subida ni sincroniza el UUID", async () => {
    saveSyncToken(STORY, TOKEN);
    const localId = LOCAL_ID;
    createNoteMemory(STORY, "chapter-1", null, "nota", { photos: [localId] });

    const { syncBodies } = mockFetch({
      photoUpload: () => jsonResponse(403, { error: "token inválido", code: "invalid_token" }),
    });

    const result = await syncNow(STORY);

    expect(syncBodies[0].memories[0].photos).toEqual([]);
    expect(loadPhotoStatuses(STORY)[localId]).toBe("failed");
    expect(result?.photoOutcomes[0].error).toContain("403");
  });
});

describe("syncNow — Caso C (sin internet y luego reintento)", () => {
  it("falla sin perder la foto y al reintentar con red la sube y sincroniza", async () => {
    saveSyncToken(STORY, TOKEN);
    const localId = LOCAL_ID;
    createNoteMemory(STORY, "chapter-1", null, "nota", { photos: [localId] });

    // 1) sin red: el upload lanza
    mockFetch({
      photoUpload: () => {
        throw new TypeError("Failed to fetch");
      },
    });
    await syncNow(STORY);
    expect(loadMemories(STORY, undefined, { includeArchived: true })[0].photos).toEqual([localId]);
    expect(loadPhotoStatuses(STORY)[localId]).toBe("failed");

    // 2) vuelve la red: reintento exitoso
    const { syncBodies } = mockFetch({
      photoUpload: () => jsonResponse(200, { url: REMOTE }),
    });
    await syncNow(STORY);
    expect(loadMemories(STORY, undefined, { includeArchived: true })[0].photos).toEqual([REMOTE]);
    expect(syncBodies[0].memories[0].photos).toEqual([REMOTE]);
    expect(loadPhotoStatuses(STORY)[localId]).toBeUndefined();
  });
});

describe("syncNow — sin token", () => {
  it("no toca la red y devuelve null", async () => {
    const { fn } = mockFetch({ photoUpload: () => jsonResponse(200, { url: REMOTE }) });
    const result = await syncNow(STORY);
    expect(result).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });
});
