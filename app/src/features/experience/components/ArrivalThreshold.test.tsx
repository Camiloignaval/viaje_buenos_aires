import { StrictMode, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadProgress, markChapterStarted } from "@/features/story/engine/progressStore";
import { ChapterStatus, type ArrivalGate } from "@/features/story/engine/types";
import { ArrivalThreshold } from "./ChapterSections";

const gate: ArrivalGate = {
  destination: "Buenos Aires",
  mode: "manual",
  confirmationCopy: "Cuando estén listos, abrimos Buenos Aires.",
  confirmLabel: "Abrir Buenos Aires",
};

const scope = "arrival-threshold-test";
const arrivalKey = "chapter-1::arrival";

function PersistedArrival() {
  const [statuses, setStatuses] = useState(() => loadProgress(scope));
  if (statuses[arrivalKey] === ChapterStatus.STARTED) return <p>Bienvenidos a Buenos Aires</p>;
  return (
    <ul>
      <ArrivalThreshold
        gate={gate}
        onOpen={() => setStatuses(markChapterStarted(scope, arrivalKey))}
      />
    </ul>
  );
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("ArrivalThreshold — llegada manual", () => {
  it("no consulta geolocalización al montar, tampoco bajo StrictMode", () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(<StrictMode><ul><ArrivalThreshold gate={gate} onOpen={vi.fn()} /></ul></StrictMode>);

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByText("Cuando estén listos, abrimos Buenos Aires.")).toBeInTheDocument();
  });

  it("funciona sin API de geolocalización", () => {
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: undefined });
    const onOpen = vi.fn();

    render(<ul><ArrivalThreshold gate={gate} onOpen={onOpen} /></ul>);
    fireEvent.click(screen.getByRole("button", { name: "Abrir Buenos Aires →" }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("confirma manualmente, persiste y no reaparece al recargar", () => {
    const first = render(<PersistedArrival />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir Buenos Aires →" }));

    expect(loadProgress(scope)[arrivalKey]).toBe(ChapterStatus.STARTED);
    expect(screen.queryByRole("button", { name: "Abrir Buenos Aires →" })).toBeNull();

    first.unmount();
    render(<PersistedArrival />);
    expect(screen.getByText("Bienvenidos a Buenos Aires")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir Buenos Aires →" })).toBeNull();
  });
});
