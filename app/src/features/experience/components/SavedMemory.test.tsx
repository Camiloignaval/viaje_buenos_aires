import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ExperienceActions, ExperienceContextValue } from "../experienceTypes";
import type { Memory } from "@/features/album/data/types";
import { ExperienceContext } from "./experienceContext";
import { SavedMemory } from "./Memories";

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: "mem-1",
    storyId: "story-a",
    chapterId: "chapter-1",
    activityId: "act-1",
    note: "La primera pizza, comida parada en el mostrador.",
    photos: ["photo-1", "photo-2", "photo-3"],
    videos: [],
    favorite: false,
    archived: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderSaved(memory: Memory, overrides: Partial<ExperienceContextValue> = {}) {
  const actions: Partial<ExperienceActions> = {
    favoriteMemory: vi.fn(),
    archiveMemory: vi.fn(),
    editMemoryNote: vi.fn(),
    addPhotosToMemory: vi.fn(),
    removeMemoryPhoto: vi.fn(),
    reorderMemoryPhotos: vi.fn(),
  };
  const value = {
    interactive: true,
    photoUrls: { "photo-1": "blob:one", "photo-2": "blob:two", "photo-3": "blob:three" },
    stagedPhotosBySlot: new Map(),
    ...overrides,
    actions,
  } as unknown as ExperienceContextValue;
  return {
    user: userEvent.setup(),
    actions: actions as ExperienceActions,
    ...render(<ExperienceContext.Provider value={value}><SavedMemory memory={memory} /></ExperienceContext.Provider>),
  };
}

describe("SavedMemory — objeto guardado silencioso", () => {
  it("muestra todas las fotos en un pliego, sin ocultar ninguna ni +N", () => {
    const { container } = renderSaved(makeMemory());
    expect(container.querySelectorAll(".pliego-tile")).toHaveLength(3);
    expect(container.querySelectorAll(".pliego-tile img")).toHaveLength(3);
    expect(container.querySelector(".pliego-more")).toBeNull();
    expect(container.querySelector(".memory-pliego")?.className).toContain("pliego-3");
    expect(container.querySelector(".memory-toolbar")).toBeNull();
  });

  it("una lámina del pliego abre el lightbox completo y Escape restaura foco", async () => {
    const { user } = renderSaved(makeMemory());
    const tile = screen.getByRole("button", { name: "Abrir la foto 1 de 3" });
    await user.click(tile);
    const dialog = screen.getByRole("dialog", { name: "Foto del recuerdo, en grande" });
    expect(within(dialog).getByText("1 / 3")).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Foto del recuerdo, en grande" })).toBeNull();
    expect(tile).toHaveFocus();
  });

  it("las acciones aparecen solo al estirar la mano", async () => {
    const { user } = renderSaved(makeMemory());
    expect(screen.queryByRole("button", { name: "retocar la línea" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Opciones del recuerdo" }));
    const whisper = screen.getByRole("dialog", { name: "Opciones discretas del recuerdo" });
    expect(within(whisper).getByRole("button", { name: "retocar la línea" })).toBeInTheDocument();
    expect(within(whisper).getByRole("button", { name: "sumar una foto" })).toBeInTheDocument();
    expect(within(whisper).getByRole("button", { name: "compartirlo aparte" })).toBeInTheDocument();
    expect(within(whisper).getByRole("button", { name: "eliminar el recuerdo" })).toBeInTheDocument();
  });

  it("el ancla del estuche alterna entre abrir y cerrar", async () => {
    const { user } = renderSaved(makeMemory());
    const anchor = screen.getByRole("button", { name: "Opciones del recuerdo" });
    await user.click(anchor);
    expect(screen.getByRole("dialog", { name: "Opciones discretas del recuerdo" })).toBeInTheDocument();
    await user.click(anchor);
    expect(screen.queryByRole("dialog", { name: "Opciones discretas del recuerdo" })).toBeNull();
  });

  it("retocar la línea guarda al salir, sin botones Guardar/Cancelar", async () => {
    const { user, actions } = renderSaved(makeMemory());
    await user.click(screen.getByRole("button", { name: "Opciones del recuerdo" }));
    await user.click(screen.getByRole("button", { name: "retocar la línea" }));
    const textarea = screen.getByRole("textbox", { name: "Retocar la línea del recuerdo" });
    await user.clear(textarea);
    await user.type(textarea, "  Texto corregido  ");
    expect(screen.queryByRole("button", { name: /Guardar cambios|Cancelar/ })).toBeNull();
    await user.tab();
    expect(actions.editMemoryNote).toHaveBeenCalledWith("mem-1", "Texto corregido");
  });

  it("Escape abandona la edición sin modificar el recuerdo", async () => {
    const { user, actions } = renderSaved(makeMemory());
    await user.click(screen.getByRole("button", { name: "Opciones del recuerdo" }));
    await user.click(screen.getByRole("button", { name: "retocar la línea" }));
    await user.type(screen.getByRole("textbox", { name: "Retocar la línea del recuerdo" }), " cambio");
    await user.keyboard("{Escape}");
    expect(actions.editMemoryNote).not.toHaveBeenCalled();
  });

  it("permite sumar y eliminar fotos sin toolbar permanente", async () => {
    const { user, actions } = renderSaved(makeMemory());
    await user.upload(screen.getByLabelText("Sumar fotos a este recuerdo"), new File(["x"], "nueva.jpg", { type: "image/jpeg" }));
    expect(actions.addPhotosToMemory).toHaveBeenCalledWith("mem-1", expect.anything());
    await user.click(screen.getByRole("button", { name: "Opciones del recuerdo" }));
    await user.click(screen.getByRole("button", { name: "reordenar las fotos" }));
    const viewer = screen.getByRole("dialog", { name: "Foto del recuerdo, en grande" });
    await user.click(within(viewer).getByRole("button", { name: "Eliminar esta foto" }));
    expect(actions.removeMemoryPhoto).toHaveBeenCalledWith("mem-1", "photo-1");
  });

  it("reordena el pliego y permite promover una secundaria como hero", async () => {
    const { user, actions } = renderSaved(makeMemory());
    await user.click(screen.getByRole("button", { name: "Opciones del recuerdo" }));
    await user.click(screen.getByRole("button", { name: "reordenar las fotos" }));
    const viewer = screen.getByRole("dialog", { name: "Foto del recuerdo, en grande" });

    await user.click(within(viewer).getByRole("button", { name: "Foto siguiente" }));
    await user.click(within(viewer).getByRole("button", { name: "Mover esta foto antes" }));
    expect(actions.reorderMemoryPhotos).toHaveBeenCalledWith(
      "mem-1",
      ["photo-2", "photo-1", "photo-3"],
    );

    await user.click(within(viewer).getByRole("button", { name: "Foto siguiente" }));
    await user.click(within(viewer).getByRole("button", { name: "Usar esta foto como principal" }));
    expect(actions.reorderMemoryPhotos).toHaveBeenLastCalledWith(
      "mem-1",
      ["photo-2", "photo-1", "photo-3"],
    );
  });

  it("usa caligrafía como acento y serif para un recuerdo largo", () => {
    const note = "Y al final nos sentamos frente al agua. Hablamos de todo y de nada durante una hora larga; el frío no importaba porque el momento ya era nuestro.";
    const { container } = renderSaved(makeMemory({ note }));
    expect(container.querySelector(".memory-note-accent")).toHaveTextContent(
      "Y al final nos sentamos frente al agua.",
    );
    expect(container.querySelector(".memory-note-body")).toHaveTextContent(
      "Hablamos de todo y de nada",
    );
  });

  it("eliminar siempre confirma en diálogo y Escape conserva", async () => {
    const { user, actions } = renderSaved(makeMemory());
    await user.click(screen.getByRole("button", { name: "Opciones del recuerdo" }));
    await user.click(screen.getByRole("button", { name: "eliminar el recuerdo" }));
    expect(screen.getByText("¿Eliminar este recuerdo? Puedes conservarlo.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Conservar" })).toHaveFocus());
    await user.keyboard("{Escape}");
    expect(actions.archiveMemory).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Opciones discretas del recuerdo" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Opciones del recuerdo" }));
    await user.click(screen.getByRole("button", { name: "eliminar el recuerdo" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(actions.archiveMemory).toHaveBeenCalledWith("mem-1");
  });

  it("descarta fotos sin URL resuelta sin romper", () => {
    const { container } = renderSaved(makeMemory(), { photoUrls: { "photo-1": "blob:one" } });
    expect(container.querySelectorAll(".pliego-tile")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Abrir la foto 1 de 1" })).toBeInTheDocument();
  });
});
