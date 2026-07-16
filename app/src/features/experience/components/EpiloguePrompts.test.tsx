import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExperienceContextValue } from "../experienceTypes";
import type { EpiloguePrompt, StoryPackage } from "@/features/story/engine/types";
import { ExperienceContext } from "./experienceContext";
import { PromptSlot } from "./EpiloguePrompts";

const actions = {
  createMemory: vi.fn(),
  addStagedPhotos: vi.fn(),
  removeStagedPhoto: vi.fn(),
  setPrimaryPhoto: vi.fn(),
  favoriteMemory: vi.fn(),
  selectEpiloguePhoto: vi.fn(),
  selectPlace: vi.fn(),
};

function renderWithExperience(ui: ReactNode, overrides: Partial<ExperienceContextValue> = {}) {
  const value = {
    actions,
    availableTripPhotos: [],
    photoUrls: {},
    stagedPhotosBySlot: new Map(),
    ...overrides,
  } as unknown as ExperienceContextValue;
  return render(<ExperienceContext.Provider value={value}>{ui}</ExperienceContext.Provider>);
}

const storyPackage = { placesCatalog: {} } as StoryPackage;

describe("epilogue memory surface", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the regular memory surface when a creation prompt needs a new photo", () => {
    const prompt: EpiloguePrompt = {
      id: "birthday-photo",
      label: "El cumpleaños",
      type: "creation",
      memoryType: "photo",
      creationPrompt: "Un momento de hoy, sin pose.",
    };

    renderWithExperience(
      <PromptSlot
        prompt={prompt}
        chapterId="chapter-epilogue"
        existingMemory={null}
        storyPackage={storyPackage}
      />,
    );

    expect(screen.getByText("El cumpleaños")).toBeInTheDocument();
    expect(screen.getByText("Un momento de hoy, sin pose.")).toBeInTheDocument();
    expect(screen.getByLabelText("Elegir fotos para este recuerdo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar el momento" })).toBeDisabled();
  });

  it("names photo choices and saves only after an explicit confirmation", async () => {
    const user = userEvent.setup();
    const prompt: EpiloguePrompt = {
      id: "best-photo",
      label: "Mejor fotografía",
      type: "retrospective",
      retrospectiveSource: "memory",
      sourceCategory: "photo",
      selectionPrompt: "¿Cuál fue la fotografía que más les gustó?",
    };

    renderWithExperience(
      <PromptSlot
        prompt={prompt}
        chapterId="chapter-epilogue"
        existingMemory={null}
        storyPackage={storyPackage}
      />,
      {
        availableTripPhotos: ["photo-1", "photo-2"],
        photoUrls: { "photo-1": "blob:photo-1", "photo-2": "blob:photo-2" },
      },
    );

    const firstPhoto = screen.getByRole("button", {
      name: "Elegir foto 1 para Mejor fotografía",
    });
    const save = screen.getByRole("button", { name: "Guardar esta elección" });
    expect(firstPhoto).toHaveAttribute("aria-pressed", "false");
    expect(save).toBeDisabled();

    await user.click(firstPhoto);
    expect(firstPhoto).toHaveAttribute("aria-pressed", "true");
    expect(save).toBeEnabled();
    expect(actions.selectEpiloguePhoto).not.toHaveBeenCalled();

    await user.click(save);
    expect(actions.selectEpiloguePhoto).toHaveBeenCalledWith(
      "chapter-epilogue",
      "best-photo",
      "photo-1",
    );
  });
});
