import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { demoStoryPackage } from "../data/demoStory";

// Aísla los stores/sync: solo queremos verificar CON QUÉ scope se los llama,
// no su comportamiento real (IndexedDB/localStorage/red). vi.hoisted permite
// referenciar los espías dentro de las factories de vi.mock (que se elevan).
const { loadProgress, loadMemories, syncNow, saveSyncToken } = vi.hoisted(() => ({
  loadProgress: vi.fn(() => ({})),
  loadMemories: vi.fn(() => []),
  syncNow: vi.fn(async () => false),
  saveSyncToken: vi.fn(),
}));

vi.mock("@/features/story/engine/progressStore", () => ({
  loadProgress,
  markChapterStarted: vi.fn(() => ({})),
  markChapterCompleted: vi.fn(() => ({})),
}));
vi.mock("@/features/album/data/memoryStore", () => ({
  loadMemories,
  createNoteMemory: vi.fn(),
  toggleFavorite: vi.fn(),
  archiveMemory: vi.fn(),
}));
vi.mock("@/features/album/data/photoStore", () => ({ savePhotoBlob: vi.fn() }));
vi.mock("@/features/sync/syncClient", () => ({
  syncNow,
  saveSyncToken,
  extractTokenFromUrl: () => "token-abc",
}));
// Reduced-motion → la intro se marca vista en el montaje (sin depender del video),
// lo que deja observar CON QUÉ scope se escribe la clave de intro.
vi.mock("@/lib/prefersReducedMotion", () => ({ prefersReducedMotion: () => true }));

import { useExperience } from "./useExperience";

const PACKAGE_STORY_ID = demoStoryPackage.storyId; // "story-ba-2026"

afterEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("useExperience — scope de persistencia (Decisión D3)", () => {
  it("por defecto (sin scopeId) keyea por el storyId del package — retrocompatible", () => {
    renderHook(() => useExperience(demoStoryPackage), { wrapper: MemoryRouter });
    expect(loadProgress).toHaveBeenCalledWith(PACKAGE_STORY_ID);
    expect(saveSyncToken).toHaveBeenCalledWith(PACKAGE_STORY_ID, "token-abc");
  });

  it("con scopeId (tripId) keyea progreso, recuerdos y sync por el tripId, NO por el storyId fijo", () => {
    renderHook(() => useExperience(demoStoryPackage, "trip-abc-123"), { wrapper: MemoryRouter });

    expect(loadProgress).toHaveBeenCalledWith("trip-abc-123");
    expect(syncNow).toHaveBeenCalledWith("trip-abc-123", expect.any(Function));
    expect(saveSyncToken).toHaveBeenCalledWith("trip-abc-123", "token-abc");

    // Blindaje: NUNCA cae al storyId interno del package cuando hay scope.
    expect(loadProgress).not.toHaveBeenCalledWith(PACKAGE_STORY_ID);
    expect(syncNow).not.toHaveBeenCalledWith(PACKAGE_STORY_ID);
  });

  it("dos trips distintos producen scopes independientes (progreso por-trip)", () => {
    const { unmount } = renderHook(() => useExperience(demoStoryPackage, "trip-uno"), {
      wrapper: MemoryRouter,
    });
    unmount();
    renderHook(() => useExperience(demoStoryPackage, "trip-dos"), { wrapper: MemoryRouter });

    expect(loadProgress).toHaveBeenCalledWith("trip-uno");
    expect(loadProgress).toHaveBeenCalledWith("trip-dos");
  });

  // Punto 8.6: la intro cinematográfica se keyea por scopeId, no por el storyId
  // fijo. Un trip nuevo NO hereda el "ya vista" de otro scope (ni del demo local).
  it("la clave de 'intro vista' se scopea por scopeId (no queda pegada al storyId fijo)", () => {
    renderHook(() => useExperience(demoStoryPackage, "trip-intro"), { wrapper: MemoryRouter });
    // En pre-viaje + reduced-motion, el montaje marca la intro vista bajo el scope.
    expect(window.sessionStorage.getItem("alaia:intro-video-2-seen:trip-intro")).toBe("1");
    expect(window.sessionStorage.getItem(`alaia:intro-video-2-seen:${PACKAGE_STORY_ID}`)).toBeNull();
  });
});
