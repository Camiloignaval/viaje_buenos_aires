import { describe, it, expect } from "vitest";
import { combineReadiness } from "./readiness";
import { ReadinessStatus, TripContextStatus } from "./status";
import type { ContentState, ContextState } from "./status";

const local: ContextState = { status: TripContextStatus.LOCAL, error: null };
const loadingCtx: ContextState = { status: TripContextStatus.LOADING, error: null };
const successCtx: ContextState = { status: TripContextStatus.SUCCESS, error: null };

function content(status: ContentState["status"], error: string | null = null): ContentState {
  return { status, error };
}

describe("combineReadiness", () => {
  it("local cuando no hay tripId", () => {
    expect(combineReadiness(local, content("local"), content("local"))).toEqual({
      status: ReadinessStatus.LOCAL,
      error: null,
    });
  });

  it("loading si el contexto todavía está cargando", () => {
    expect(
      combineReadiness(loadingCtx, content("local"), content("local")).status,
    ).toBe(ReadinessStatus.LOADING);
  });

  it("loading si el contexto ya resolvió pero story o media siguen cargando", () => {
    expect(
      combineReadiness(successCtx, content("loading"), content("success")).status,
    ).toBe(ReadinessStatus.LOADING);
  });

  it("ready si contexto, story y media están todos success", () => {
    expect(
      combineReadiness(successCtx, content("success"), content("success")),
    ).toEqual({ status: ReadinessStatus.READY, error: null });
  });

  it("partial si story está empty pero media está success", () => {
    expect(
      combineReadiness(successCtx, content("empty"), content("success")).status,
    ).toBe(ReadinessStatus.PARTIAL);
  });

  it("empty si story y media están ambos empty", () => {
    expect(
      combineReadiness(successCtx, content("empty"), content("empty")).status,
    ).toBe(ReadinessStatus.EMPTY);
  });

  it("error si el contexto falla, sin importar story/media", () => {
    const ctx: ContextState = { status: TripContextStatus.NOT_FOUND, error: null };
    expect(
      combineReadiness(ctx, content("success"), content("success")).status,
    ).toBe(ReadinessStatus.ERROR);
  });

  it("error si story o media fallan aunque el contexto haya resuelto bien", () => {
    expect(
      combineReadiness(
        successCtx,
        content("error", "no se pudo cargar la historia"),
        content("success"),
      ),
    ).toEqual({
      status: ReadinessStatus.ERROR,
      error: "no se pudo cargar la historia",
    });
  });
});
