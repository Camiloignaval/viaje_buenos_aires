import { useMemo, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ExperienceContextValue } from "../experienceTypes";
import { ExperienceContext } from "./experienceContext";
import { LockedChapterModal } from "./LockedChapterModal";

function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({
      lockedChapterNotice: open
        ? { line: "Todavía falta un poco", unlockLabel: "18 de julio" }
        : null,
      actions: {
        closeLockedChapter() {
          onClose();
          setOpen(false);
        },
      },
    }),
    [onClose, open],
  ) as unknown as ExperienceContextValue;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir capítulo pendiente
      </button>
      <ExperienceContext.Provider value={value}>
        <LockedChapterModal />
      </ExperienceContext.Provider>
    </>
  );
}

describe("LockedChapterModal", () => {
  it("aísla el fondo y mantiene Tab y Shift+Tab dentro del diálogo", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Abrir capítulo pendiente" });

    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Todavía falta un poco" });
    const close = screen.getByRole("button", { name: "Seguir explorando" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(trigger).toHaveAttribute("aria-hidden", "true");
    expect(trigger).toHaveAttribute("inert");
    expect(close).toHaveFocus();

    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(close).toHaveFocus();
  });

  it("cierra con Escape, restaura el foco y revierte el aislamiento", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole("button", { name: "Abrir capítulo pendiente" });
    await user.click(trigger);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
    expect(trigger).not.toHaveAttribute("aria-hidden");
    expect(trigger).not.toHaveAttribute("inert");
  });
});
