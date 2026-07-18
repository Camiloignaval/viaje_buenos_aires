import { describe, it, expect, beforeEach } from "vitest";
import { loadPhotoStatuses, setPhotoStatus, clearPhotoStatus } from "./uploadStatusStore";

const STORY = "story-e";

beforeEach(() => window.localStorage.clear());

describe("uploadStatusStore (Caso E — reload)", () => {
  it("persiste uploading/failed y sobrevive a un 'reload' (nueva lectura)", () => {
    setPhotoStatus(STORY, "p1", "uploading");
    setPhotoStatus(STORY, "p2", "failed");
    // simula reload: loadPhotoStatuses lee de localStorage desde cero
    const reloaded = loadPhotoStatuses(STORY);
    expect(reloaded).toEqual({ p1: "uploading", p2: "failed" });
  });

  it("'pending' es el default implícito: limpia la entrada", () => {
    setPhotoStatus(STORY, "p1", "failed");
    setPhotoStatus(STORY, "p1", "pending");
    expect(loadPhotoStatuses(STORY).p1).toBeUndefined();
  });

  it("clearPhotoStatus elimina la entrada (al promoverse a URL)", () => {
    setPhotoStatus(STORY, "p1", "uploading");
    clearPhotoStatus(STORY, "p1");
    expect(loadPhotoStatuses(STORY).p1).toBeUndefined();
  });

  it("namespacea por storyId", () => {
    setPhotoStatus("story-a", "p1", "failed");
    expect(loadPhotoStatuses("story-b")).toEqual({});
  });
});
