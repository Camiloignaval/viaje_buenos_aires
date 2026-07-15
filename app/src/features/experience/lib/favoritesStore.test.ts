import { describe, it, expect } from "vitest";
import {
  addFavorite,
  isFavorite,
  loadFavorites,
  removeFavorite,
  toggleFavorite,
  type KeyValueStorage,
} from "./favoritesStore";

function memoryStorage(): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

describe("favoritesStore", () => {
  it("marca y consulta un favorito", () => {
    const s = memoryStorage();
    expect(isFavorite("trip-1", "cuartito", s)).toBe(false);
    addFavorite("trip-1", "cuartito", s);
    expect(isFavorite("trip-1", "cuartito", s)).toBe(true);
  });

  it("quita un favorito", () => {
    const s = memoryStorage();
    addFavorite("trip-1", "cuartito", s);
    removeFavorite("trip-1", "cuartito", s);
    expect(isFavorite("trip-1", "cuartito", s)).toBe(false);
  });

  it("toggle alterna y reporta el nuevo estado", () => {
    const s = memoryStorage();
    expect(toggleFavorite("trip-1", "la-cabrera", s)).toBe(true);
    expect(toggleFavorite("trip-1", "la-cabrera", s)).toBe(false);
  });

  it("persiste y sobrevive una recarga (misma clave de storage)", () => {
    const s = memoryStorage();
    addFavorite("trip-1", "la-biela", s);
    // Nueva instancia lógica leyendo el mismo storage subyacente.
    expect(loadFavorites("trip-1", s)["la-biela"]).toBeTruthy();
  });

  it("admite múltiples favoritos", () => {
    const s = memoryStorage();
    addFavorite("trip-1", "a", s);
    addFavorite("trip-1", "b", s);
    expect(Object.keys(loadFavorites("trip-1", s))).toHaveLength(2);
  });

  it("los favoritos pertenecen al viaje: dos viajes no se mezclan", () => {
    const s = memoryStorage();
    addFavorite("trip-1", "cuartito", s);
    expect(isFavorite("trip-2", "cuartito", s)).toBe(false);
  });

  it("un viaje sin favoritos devuelve un mapa vacío", () => {
    expect(loadFavorites("trip-nuevo", memoryStorage())).toEqual({});
  });

  it("no duplica al marcar dos veces el mismo favorito", () => {
    const s = memoryStorage();
    addFavorite("trip-1", "x", s);
    addFavorite("trip-1", "x", s);
    expect(Object.keys(loadFavorites("trip-1", s))).toHaveLength(1);
  });
});
