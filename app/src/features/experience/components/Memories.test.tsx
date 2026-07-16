import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Memory } from "@/features/album/data/types";
import type { ExperienceContextValue } from "../experienceTypes";
import { ExperienceContext } from "./experienceContext";
import { MemoryInvitation, SavedMemory } from "./Memories";

const actions = {
  createMemory: vi.fn(),
  addStagedPhotos: vi.fn(),
  removeStagedPhoto: vi.fn(),
  setPrimaryPhoto: vi.fn(),
  favoriteMemory: vi.fn(),
};

function renderWithExperience(ui: ReactNode) {
  const value = {
    actions,
    photoUrls: {},
  } as unknown as ExperienceContextValue;
  return render(<ExperienceContext.Provider value={value}>{ui}</ExperienceContext.Provider>);
}

const memory: Memory = {
  id: "memory-1",
  storyId: "story-1",
  chapterId: "chapter-1",
  activityId: "activity-1",
  note: "La caminata sin apuro.",
  photos: [],
  videos: [],
  favorite: false,
  archived: false,
  createdAt: "2026-07-16T10:00:00.000Z",
  updatedAt: "2026-07-16T10:00:00.000Z",
};

describe("unified memory surface", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers the same note, photo and save controls with or without an editorial suggestion", () => {
    const first = renderWithExperience(
      <MemoryInvitation chapterId="chapter-1" activityId="activity-1" />,
    );

    expect(screen.getByText("¿Quieren guardar este momento?")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Qué quieren recordar de este momento" })).toBeInTheDocument();
    expect(screen.getByLabelText("Elegir fotos para este recuerdo")).not.toHaveAttribute("hidden");
    expect(screen.getByRole("button", { name: "Guardar el momento" })).toBeDisabled();
    first.unmount();

    renderWithExperience(
      <MemoryInvitation
        chapterId="chapter-1"
        activityId="activity-2"
        hint="La luz de la tarde sobre el Obelisco."
      />,
    );

    expect(screen.getByText("La luz de la tarde sobre el Obelisco.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Qué quieren recordar de este momento" })).toBeInTheDocument();
    expect(screen.getByLabelText("Elegir fotos para este recuerdo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar el momento" })).toBeDisabled();
  });

  it("keeps save unavailable while empty and creates one memory after writing", async () => {
    const user = userEvent.setup();
    renderWithExperience(<MemoryInvitation chapterId="chapter-1" activityId="activity-1" />);
    const save = screen.getByRole("button", { name: "Guardar el momento" });

    expect(save).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: "Qué quieren recordar de este momento" }),
      "La risa en Corrientes.",
    );
    expect(save).toBeEnabled();
    await user.click(save);

    expect(actions.createMemory).toHaveBeenCalledWith(
      "chapter-1",
      "activity-1",
      "La risa en Corrientes.",
    );
  });

  it("exposes only the reversible favorite action on a saved memory", async () => {
    const user = userEvent.setup();
    renderWithExperience(<SavedMemory memory={memory} />);
    const favorite = screen.getByRole("button", {
      name: "Guardar entre nuestros recuerdos favoritos",
    });

    expect(favorite).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Dejar aparte" })).not.toBeInTheDocument();
    await user.click(favorite);
    expect(actions.favoriteMemory).toHaveBeenCalledWith("memory-1");
  });
});
