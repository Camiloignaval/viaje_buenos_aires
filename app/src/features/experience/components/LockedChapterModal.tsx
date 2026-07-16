import { useEffect, useRef } from "react";
import { useExperienceCtx } from "./experienceContext";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// Espejo de renderLockedChapterModal. Modal cálido cuando se toca un capítulo aún
// bloqueado. Aísla el fondo y conserva el ciclo de foco hasta cerrarse.
export function LockedChapterModal() {
  const { lockedChapterNotice, actions } = useExperienceCtx();
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeActionRef = useRef(actions.closeLockedChapter);
  closeActionRef.current = actions.closeLockedChapter;

  useEffect(() => {
    const backdrop = backdropRef.current;
    const dialog = dialogRef.current;
    if (!lockedChapterNotice || !backdrop || !dialog) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = [...(backdrop.parentElement?.children ?? [])]
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== backdrop)
      .map((element) => ({
        element,
        ariaHidden: element.getAttribute("aria-hidden"),
        inert: element.hasAttribute("inert"),
      }));

    for (const { element } of background) {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    }

    dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeActionRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      for (const { element, ariaHidden, inert } of background) {
        if (inert) element.setAttribute("inert", "");
        else element.removeAttribute("inert");
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [lockedChapterNotice]);

  if (!lockedChapterNotice) {
    return null;
  }
  const detail =
    lockedChapterNotice.detail ??
    `Este capítulo estará disponible el ${lockedChapterNotice.unlockLabel}.`;
  const actionLabel = lockedChapterNotice.actionLabel ?? "Seguir explorando";
  return (
    <div ref={backdropRef} className="locked-chapter-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="locked-chapter-modal"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby="locked-chapter-title"
        aria-describedby="locked-chapter-copy"
      >
        <p className="locked-chapter-eyebrow">Alaia</p>
        <h2 id="locked-chapter-title">{lockedChapterNotice.line}</h2>
        <p id="locked-chapter-copy">{detail}</p>
        <button
          type="button"
          data-action="close-locked-chapter"
          onClick={() => actions.closeLockedChapter()}
        >
          {actionLabel}
        </button>
      </section>
    </div>
  );
}
