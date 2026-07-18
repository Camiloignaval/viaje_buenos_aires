import { describe, it, expect } from "vitest";
import { describeBadge } from "./badge";
import { ReadinessStatus } from "./status";

describe("describeBadge", () => {
  it("no aparece en modo local", () => {
    expect(describeBadge({ status: ReadinessStatus.LOCAL, error: null })).toBe(null);
  });

  it('aparece "Conectando viaje…" en loading', () => {
    expect(describeBadge({ status: ReadinessStatus.LOADING, error: null })).toEqual({
      text: "Conectando viaje…",
      tone: "loading",
    });
  });

  it("se retira en silencio cuando ya está conectado (ready/partial/empty)", () => {
    // Una vez conectado no hay nada accionable: la insignia no flota sobre la lectura.
    expect(describeBadge({ status: ReadinessStatus.READY, error: null })).toBe(null);
    expect(describeBadge({ status: ReadinessStatus.PARTIAL, error: null })).toBe(null);
    expect(describeBadge({ status: ReadinessStatus.EMPTY, error: null })).toBe(null);
  });

  it("aparece error cuando falla", () => {
    expect(describeBadge({ status: ReadinessStatus.ERROR, error: "no se pudo" })).toEqual({
      text: "No pudimos conectar este viaje",
      tone: "error",
    });
  });
});
