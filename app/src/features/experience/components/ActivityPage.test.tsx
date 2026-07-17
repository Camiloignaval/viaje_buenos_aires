import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ExperienceContextValue } from "../experienceTypes";
import type { ActivityWithPlace } from "@/features/story/engine/chapterContent";
import { ExperienceContext } from "./experienceContext";
import { ActivityPage } from "./ChapterSections";

const entry = {
  activity: {
    id: "act-1",
    title: "El primer café",
    moment: "La ciudad despierta",
    description: "La mañana empieza junto a la ventana.",
    timeWindow: "09:00",
    category: "Café",
  },
  place: null,
  suggestedMemories: [],
} as ActivityWithPlace;

function renderPage(interactive: boolean) {
  const value = {
    interactive,
    stagedPhotosBySlot: new Map(),
    actions: { createMemory: () => undefined },
  } as unknown as ExperienceContextValue;

  return render(
    <ExperienceContext.Provider value={value}>
      <ActivityPage entry={entry} chapterId="chapter-1" memoriesByActivityId={new Map()} />
    </ExperienceContext.Provider>,
  );
}

describe("ActivityPage", () => {
  it("se estructura como una página narrativa, no como una card", () => {
    const { container } = renderPage(false);

    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /el primer café/i })).toBeInTheDocument();
    expect(container.querySelector(".activity-page")).toBeInTheDocument();
    expect(container.querySelector(".activity-card")).toBeNull();
  });

  it("integra la captura como una marca de la página, sin abrir un bloque Recuerdo", () => {
    renderPage(true);

    expect(
      screen.getByRole("complementary", { name: "Marcas que quedaron en esta página" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Recuerdo$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /qué quieren recordar/i })).toBeInTheDocument();
  });
});
