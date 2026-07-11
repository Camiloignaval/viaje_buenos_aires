import { describe, it, expect, beforeEach } from "vitest";
import { migrateAuroraKeys } from "./brandMigration";

// Storage falso en memoria, con la Storage API mínima que usa la migración.
function makeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key(i: number) {
      return [...map.keys()][i] ?? null;
    },
    getItem(k: string) {
      return map.has(k) ? (map.get(k) as string) : null;
    },
    setItem(k: string, v: string) {
      map.set(k, v);
    },
    removeItem(k: string) {
      map.delete(k);
    },
    clear() {
      map.clear();
    },
  } as Storage;
}

describe("migrateAuroraKeys", () => {
  let storage: Storage;
  beforeEach(() => {
    storage = makeStorage({
      "aurora:progress:story-a": "P",
      "aurora:memories:story-a": "M",
      "aurora:sync-token:story-a": "T",
      "other:key": "X",
    });
  });

  it("copia cada aurora:* a alaia:* SIN borrar las viejas", () => {
    migrateAuroraKeys(storage);
    expect(storage.getItem("alaia:progress:story-a")).toBe("P");
    expect(storage.getItem("alaia:memories:story-a")).toBe("M");
    expect(storage.getItem("alaia:sync-token:story-a")).toBe("T");
    // Las viejas siguen (ventana de compat, rollback trivial).
    expect(storage.getItem("aurora:progress:story-a")).toBe("P");
  });

  it("no toca claves ajenas al prefijo aurora:", () => {
    migrateAuroraKeys(storage);
    expect(storage.getItem("other:key")).toBe("X");
    expect(storage.getItem("alaia:key")).toBeNull();
  });

  it("es idempotente: reejecutar no pisa datos ya migrados ni datos nuevos (copy-if-absent)", () => {
    migrateAuroraKeys(storage);
    // Simula una escritura nueva post-migración en la clave alaia.
    storage.setItem("alaia:progress:story-a", "NUEVO");
    migrateAuroraKeys(storage);
    expect(storage.getItem("alaia:progress:story-a")).toBe("NUEVO");
  });

  it("no rompe si el storage lanza al accederse (modo privado)", () => {
    const throwing = {
      get length(): number {
        throw new Error("SecurityError");
      },
    } as unknown as Storage;
    expect(() => migrateAuroraKeys(throwing)).not.toThrow();
  });
});
