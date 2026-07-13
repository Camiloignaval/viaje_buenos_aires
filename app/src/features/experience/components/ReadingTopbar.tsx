import { useExperienceCtx } from "./experienceContext";
import { ThemeSwitch } from "./ThemeSwitch";

type TopbarAction = "open-index" | "close-preparations";

interface ReadingTopbarProps {
  label?: string;
  action?: TopbarAction;
  extraClass?: string;
}

// Espejo de renderReadingTopbar(interactive, theme, {label, action, extraClass}).
export function ReadingTopbar({
  label = "← Volver al índice",
  action = "open-index",
  extraClass = "",
}: ReadingTopbarProps) {
  const { interactive, actions } = useExperienceCtx();
  if (!interactive) {
    return null;
  }
  const classes = ["reading-topbar", extraClass].filter(Boolean).join(" ");
  const backClass =
    action === "open-index" ? "book-back-link book-back-chapters" : "book-back-link";
  const onClick = action === "open-index" ? actions.openIndex : actions.closePreparations;
  return (
    <div className={classes}>
      <button type="button" className={backClass} data-action={action} onClick={onClick}>
        {label}
      </button>
      <ThemeSwitch extraClass="theme-switch-inline" />
    </div>
  );
}

// Espejo de renderChapterTopbar.
export function ChapterTopbar() {
  return (
    <ReadingTopbar
      label="← Volver al índice"
      action="open-index"
      extraClass="chapter-topbar"
    />
  );
}
