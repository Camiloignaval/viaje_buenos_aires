import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StoryBeginning } from "./StoryBeginning";
import type { Trip } from "../../types";

const TRIP: Trip = {
  id: "t1",
  title: "Buenos Aires",
  destination: "Buenos Aires",
  baseStoryId: "ba-2026",
  status: "active",
  role: "owner",
  updatedAt: "2026-07-09T12:00:00.000Z",
};

describe("StoryBeginning", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra la voz de Alaia — nunca spinner, barra ni 'Loading…'", () => {
    render(<StoryBeginning run={() => new Promise(() => {})} onSuccess={() => {}} onError={() => {}} />);
    expect(screen.getByText("Alaia")).toBeInTheDocument();
    expect(screen.getByText("Cada historia comienza de una forma distinta.")).toBeInTheDocument();
    expect(screen.getByText("Creo que ya estoy lista para acompañarlos.")).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it("no llama onSuccess antes del mínimo (~2.6s) aunque el backend responda al instante", async () => {
    const onSuccess = vi.fn();
    render(<StoryBeginning run={() => Promise.resolve(TRIP)} onSuccess={onSuccess} onError={() => {}} />);

    // El backend "ya respondió" (microtask resuelta), pero el timer todavía no.
    await vi.advanceTimersByTimeAsync(0);
    expect(onSuccess).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2200);
    expect(onSuccess).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(onSuccess).toHaveBeenCalledWith(TRIP);
  });

  it("llama onError si run() rechaza, respetando igual la permanencia mínima", async () => {
    const onError = vi.fn();
    render(
      <StoryBeginning run={() => Promise.reject(new Error("boom"))} onSuccess={() => {}} onError={onError} />,
    );

    await vi.advanceTimersByTimeAsync(2200);
    expect(onError).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
