import { describe, it, expect } from "vitest";
import { resolveLaunchTarget } from "./continuity";
import {
  getContinuity,
  rememberReadingPosition,
  rememberTrip,
  type KeyValueStorage,
} from "./continuityStore";

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

describe("resolveLaunchTarget", () => {
  it("restaura el último viaje solo si la app está instalada (standalone)", () => {
    const continuity = { tripId: "trip-1", updatedAt: "2026-07-18T10:00:00Z" };
    expect(resolveLaunchTarget({ continuity, standalone: true })).toEqual({ kind: "restore", tripId: "trip-1" });
    expect(resolveLaunchTarget({ continuity, standalone: false })).toEqual({ kind: "default" });
  });

  it("sin continuidad, va al destino por defecto", () => {
    expect(resolveLaunchTarget({ continuity: null, standalone: true })).toEqual({ kind: "default" });
  });
});

describe("continuityStore", () => {
  it("recuerda el último viaje abierto", () => {
    const s = memoryStorage();
    rememberTrip("trip-1", s);
    expect(getContinuity(s)?.tripId).toBe("trip-1");
  });

  it("preserva el capítulo si se reabre el mismo viaje", () => {
    const s = memoryStorage();
    rememberReadingPosition("trip-1", "chapter-2", s);
    rememberTrip("trip-1", s);
    expect(getContinuity(s)?.chapterId).toBe("chapter-2");
  });

  it("olvida la posición de lectura al cambiar de viaje", () => {
    const s = memoryStorage();
    rememberReadingPosition("trip-1", "chapter-2", s);
    rememberTrip("trip-2", s);
    const state = getContinuity(s);
    expect(state?.tripId).toBe("trip-2");
    expect(state?.chapterId).toBeNull();
  });

  it("lectura defensiva ante datos corruptos", () => {
    const s: KeyValueStorage = { getItem: () => "no-es-json", setItem: () => {} };
    expect(getContinuity(s)).toBeNull();
  });
});
