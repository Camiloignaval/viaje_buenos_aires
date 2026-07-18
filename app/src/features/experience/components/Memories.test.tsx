import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExperienceActions, ExperienceContextValue } from "../experienceTypes";
import type { Memory } from "@/features/album/data/types";
import { ExperienceContext } from "./experienceContext";
import { MemoryInvitation, SavedMemory } from "./Memories";

function renderWithExperience(ui: React.ReactNode) {
  const actions: Partial<ExperienceActions> = {
    createMemory: vi.fn(),
    addStagedPhotos: vi.fn(),
    removeStagedPhoto: vi.fn(),
    setPrimaryPhoto: vi.fn(),
    favoriteMemory: vi.fn(),
    archiveMemory: vi.fn(),
    editMemoryNote: vi.fn(),
    addPhotosToMemory: vi.fn(),
    removeMemoryPhoto: vi.fn(),
    reorderMemoryPhotos: vi.fn(),
  };
  const value = {
    photoUrls: {},
    stagedPhotosBySlot: new Map(),
    actions,
  } as unknown as ExperienceContextValue;
  return { actions: actions as ExperienceActions, ...render(<ExperienceContext.Provider value={value}>{ui}</ExperienceContext.Provider>) };
}

afterEach(() => vi.useRealTimers());

describe("ceremonia editorial del recuerdo", () => {
  it("empieza como una hoja en espera con dos acciones claras, no como formulario", () => {
    renderWithExperience(<MemoryInvitation chapterId="chapter-1" activityId="activity-1" />);
    expect(screen.getByRole("button", { name: "Escribir un recuerdo de este momento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sumar una foto a este momento" })).toBeInTheDocument();
    expect(screen.getByText("Aquí vivirá uno de nuestros recuerdos")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /Guardar el momento/i })).toBeNull();
  });

  it("se vuelve escribible in situ y se asienta sola después de una línea", () => {
    vi.useFakeTimers();
    const { actions } = renderWithExperience(<MemoryInvitation chapterId="chapter-1" activityId="activity-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Escribir un recuerdo de este momento" }));
    const line = screen.getByRole("textbox", { name: "Escribir lo que quieren recordar de este momento" });
    fireEvent.change(line, { target: { value: "  La caminata sin apuro.  " } });
    expect(screen.queryByRole("button", { name: /^guardar/i })).toBeNull();
    act(() => vi.advanceTimersByTime(901));
    expect(actions.createMemory).toHaveBeenCalledWith("chapter-1", "activity-1", "La caminata sin apuro.");
  });

  it("se puede cerrar sin guardar y vuelve a la hoja en espera", () => {
    const { actions } = renderWithExperience(<MemoryInvitation chapterId="chapter-1" activityId="activity-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Escribir un recuerdo de este momento" }));
    expect(screen.getByRole("textbox", { name: "Escribir lo que quieren recordar de este momento" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sin guardar" }));
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Escribir un recuerdo de este momento" })).toBeInTheDocument();
    expect(actions.createMemory).not.toHaveBeenCalled();
  });

  it("retira la estrella y los controles heredados del recuerdo guardado", () => {
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
      createdAt: "2026-07-16T10:00:00Z",
      updatedAt: "2026-07-16T10:00:00Z",
    };
    const { container } = renderWithExperience(<SavedMemory memory={memory} />);
    expect(container.querySelector(".memory-wax-seal")).toBeNull();
    expect(container.querySelector(".memory-toolbar")).toBeNull();
    expect(screen.queryByRole("button", { name: /Marcar entre los que no queremos olvidar/i })).toBeNull();
  });
});

describe("estado visual de sincronización (hotfix Épica 5)", () => {
  function renderWithStatus({
    photos,
    photoStatuses,
    syncEnabled,
  }: {
    photos: string[];
    photoStatuses: Record<string, string>;
    syncEnabled: boolean;
  }) {
    const memory: Memory = {
      id: "m1",
      storyId: "s",
      chapterId: "c",
      activityId: "a",
      note: "",
      photos,
      videos: [],
      favorite: false,
      archived: false,
      createdAt: "2026-07-16T10:00:00Z",
      updatedAt: "2026-07-16T10:00:00Z",
    };
    const retryPhotoSync = vi.fn();
    const value = {
      photoUrls: Object.fromEntries(photos.map((id) => [id, `blob:${id}`])),
      photoStatuses,
      syncEnabled,
      stagedPhotosBySlot: new Map(),
      actions: { retryPhotoSync } as unknown as ExperienceActions,
    } as unknown as ExperienceContextValue;
    return {
      retryPhotoSync,
      ...render(
        <ExperienceContext.Provider value={value}>
          <SavedMemory memory={memory} />
        </ExperienceContext.Provider>,
      ),
    };
  }

  it("muestra 'Subiendo…' mientras una foto local está en curso", () => {
    renderWithStatus({ photos: ["uuid-1"], photoStatuses: { "uuid-1": "uploading" }, syncEnabled: true });
    expect(screen.getByText("Subiendo…")).toBeInTheDocument();
  });

  it("muestra 'Sincronizada' cuando todas las fotos son URL remota", () => {
    const url = "https://res.cloudinary.com/x/y.jpg";
    renderWithStatus({ photos: [url], photoStatuses: { [url]: "uploaded" }, syncEnabled: true });
    expect(screen.getByText("Sincronizada")).toBeInTheDocument();
  });

  it("Caso B/G: muestra 'No se pudo subir' con 'Reintentar' que dispara retryPhotoSync", () => {
    const { retryPhotoSync } = renderWithStatus({
      photos: ["uuid-1"],
      photoStatuses: { "uuid-1": "failed" },
      syncEnabled: true,
    });
    expect(screen.getByText("No se pudo subir")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retryPhotoSync).toHaveBeenCalledTimes(1);
  });

  it("sin sync habilitado no muestra ningún estado (app puramente local)", () => {
    renderWithStatus({ photos: ["uuid-1"], photoStatuses: { "uuid-1": "failed" }, syncEnabled: false });
    expect(screen.queryByText("No se pudo subir")).toBeNull();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });
});

describe("pliego multi-foto determinista", () => {
  function renderSavedWithPhotos(count: number) {
    const photos = Array.from({ length: count }, (_, i) => `p${i}`);
    const photoUrls = Object.fromEntries(photos.map((id) => [id, `blob:${id}`]));
    const memory: Memory = {
      id: "m1",
      storyId: "s",
      chapterId: "c",
      activityId: "a",
      note: "",
      photos,
      videos: [],
      favorite: false,
      archived: false,
      createdAt: "2026-07-16T10:00:00Z",
      updatedAt: "2026-07-16T10:00:00Z",
    };
    const actions: Partial<ExperienceActions> = {
      favoriteMemory: vi.fn(),
      archiveMemory: vi.fn(),
      editMemoryNote: vi.fn(),
      addPhotosToMemory: vi.fn(),
      removeMemoryPhoto: vi.fn(),
      reorderMemoryPhotos: vi.fn(),
    };
    const value = { photoUrls, stagedPhotosBySlot: new Map(), actions } as unknown as ExperienceContextValue;
    return render(
      <ExperienceContext.Provider value={value}>
        <SavedMemory memory={memory} />
      </ExperienceContext.Provider>,
    );
  }

  it("muestra TODAS las fotos hasta 6, sin ocultar ninguna ni mostrar +N", () => {
    const layouts = ["single", "duo", "hero-two", "hero-row-three", "hero-grid", "hero-grid"];
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const { container, unmount } = renderSavedWithPhotos(n);
      const pliego = container.querySelector(".memory-pliego");
      expect(container.querySelectorAll(".pliego-tile")).toHaveLength(n);
      expect(container.querySelector(".pliego-more")).toBeNull();
      expect(pliego?.className).toContain(`pliego-${n <= 4 ? n : 6}`);
      expect(pliego).toHaveAttribute("data-layout", layouts[n - 1]);
      expect(pliego).toHaveAttribute("data-visible-count", String(n));
      expect(pliego).toHaveAttribute("data-overflow", "0");
      unmount();
    }
  });

  it("desde la 7.ª muestra hero + 3 y +N con las fotos que realmente sobran", () => {
    const { container } = renderSavedWithPhotos(9);
    expect(container.querySelectorAll(".pliego-tile")).toHaveLength(4);
    const more = container.querySelector(".pliego-more");
    expect(more).not.toBeNull();
    expect(more?.getAttribute("data-more")).toBe("5");
    expect(container.querySelector(".memory-pliego")?.className).toContain("pliego-7");
  });

  it("el +N abre la primera fotografía fuera del límite visible", async () => {
    const user = userEvent.setup();
    renderSavedWithPhotos(7);
    await user.click(screen.getByRole("button", { name: "Ver 3 fotos adicionales, 7 en total" }));
    expect(screen.getByRole("dialog", { name: "Foto del recuerdo, en grande" })).toBeInTheDocument();
    expect(screen.getByText("5 / 7")).toBeInTheDocument();
  });
});
