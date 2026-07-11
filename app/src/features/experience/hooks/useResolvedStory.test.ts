import { describe, it, expect } from "vitest";
import { resolveStory } from "./useResolvedStory";
import type { ConnectedTripState } from "@/features/connected/hooks/useConnectedTrip";
import type { StoryContentState } from "@/features/connected/hooks/useConnectedContent";
import { ContentStatus, TripContextStatus } from "@/features/connected/lib/status";
import type { StoryPackage } from "@/features/story/engine/types";
import { auroraStoryPackage } from "../data/auroraStory";

function trip(overrides: Partial<ConnectedTripState>): ConnectedTripState {
  return { status: TripContextStatus.SUCCESS, tripId: "trip-1", trip: null, error: null, ...overrides };
}

function content(overrides: Partial<StoryContentState>): StoryContentState {
  return { status: ContentStatus.SUCCESS, story: null, error: null, ...overrides };
}

// La derivación mira el status CRUDO del viaje; el contenido solo importa cuando
// el viaje ya resolvió con éxito. Ese es el orden que preserva `not-found`.
describe("resolveStory — derivación de los 6 estados", () => {
  it("sin tripId (LOCAL) → local", () => {
    expect(resolveStory(trip({ status: TripContextStatus.LOCAL, tripId: null }), content({})).kind).toBe(
      "local",
    );
  });

  it("viaje cargando → loading", () => {
    expect(resolveStory(trip({ status: TripContextStatus.LOADING }), content({})).kind).toBe("loading");
  });

  it("viaje resuelto + contenido cargando → loading", () => {
    const r = resolveStory(trip({}), content({ status: ContentStatus.LOADING }));
    expect(r.kind).toBe("loading");
  });

  it("viaje resuelto con historia válida → ready (con storyPackage y scopeId = tripId)", () => {
    const r = resolveStory(
      trip({ tripId: "trip-ba" }),
      content({ status: ContentStatus.SUCCESS, story: { storyPackage: auroraStoryPackage } }),
    );
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") {
      expect(r.scopeId).toBe("trip-ba");
      expect(r.storyPackage.storyId).toBe("story-ba-2026");
    }
  });

  it("viaje resuelto sin historia (EMPTY) → empty", () => {
    expect(resolveStory(trip({}), content({ status: ContentStatus.EMPTY })).kind).toBe("empty");
  });

  it("viaje 404/403 (NOT_FOUND) → not-found", () => {
    expect(resolveStory(trip({ status: TripContextStatus.NOT_FOUND }), content({})).kind).toBe(
      "not-found",
    );
  });

  it("viaje con fallo técnico (ERROR) → error, con mensaje", () => {
    const r = resolveStory(
      trip({ status: TripContextStatus.ERROR, error: "500 boom" }),
      content({}),
    );
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.message).toBe("500 boom");
  });

  it("contenido con fallo técnico (getStory ≠404) → error", () => {
    const r = resolveStory(trip({}), content({ status: ContentStatus.ERROR, error: "cayó la API" }));
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.message).toBe("cayó la API");
  });

  it("historia SUCCESS pero con package malformado → error técnico (NO empty, NO crash)", () => {
    const r = resolveStory(
      trip({}),
      content({
        status: ContentStatus.SUCCESS,
        story: { storyPackage: { storyId: "roto" } as unknown as StoryPackage },
      }),
    );
    expect(r.kind).toBe("error");
  });
});

// El corazón de D8: estos tres estados NUNCA se colapsan entre sí. Un viaje que no
// existe no es lo mismo que un viaje sin historia, y ninguno es un error técnico.
describe("resolveStory — not-found, empty y error son estados DISTINTOS", () => {
  const notFound = resolveStory(trip({ status: TripContextStatus.NOT_FOUND }), content({}));
  const empty = resolveStory(trip({}), content({ status: ContentStatus.EMPTY }));
  const error = resolveStory(trip({ status: TripContextStatus.ERROR, error: "x" }), content({}));

  it("tres kinds diferentes entre sí", () => {
    const kinds = new Set([notFound.kind, empty.kind, error.kind]);
    expect(kinds).toEqual(new Set(["not-found", "empty", "error"]));
  });

  it("ninguno cae jamás a ready/local (nunca abre una historia)", () => {
    for (const r of [notFound, empty, error]) {
      expect(["ready", "local"]).not.toContain(r.kind);
    }
  });
});
