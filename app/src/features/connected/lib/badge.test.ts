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

  it('aparece "Viaje conectado" cuando ready (y también en partial/empty)', () => {
    expect(describeBadge({ status: ReadinessStatus.READY, error: null })).toEqual({
      text: "Viaje conectado",
      tone: "success",
    });
    expect(describeBadge({ status: ReadinessStatus.PARTIAL, error: null })?.tone).toBe(
      "success",
    );
    expect(describeBadge({ status: ReadinessStatus.EMPTY, error: null })?.tone).toBe(
      "success",
    );
  });

  it("aparece error cuando falla", () => {
    expect(describeBadge({ status: ReadinessStatus.ERROR, error: "no se pudo" })).toEqual({
      text: "No pudimos conectar este viaje",
      tone: "error",
    });
  });
});
