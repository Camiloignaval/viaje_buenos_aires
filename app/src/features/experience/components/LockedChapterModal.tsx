import { useExperienceCtx } from "./experienceContext";

// Espejo de renderLockedChapterModal. Modal cálido cuando se toca un capítulo aún
// bloqueado. El foco y el cierre por Escape los maneja useExperience.
export function LockedChapterModal() {
  const { lockedChapterNotice, actions } = useExperienceCtx();
  if (!lockedChapterNotice) {
    return null;
  }
  const detail =
    lockedChapterNotice.detail ??
    `Este capítulo estará disponible el ${lockedChapterNotice.unlockLabel}.`;
  const actionLabel = lockedChapterNotice.actionLabel ?? "Seguir explorando";
  return (
    <div className="locked-chapter-backdrop" role="presentation">
      <section
        className="locked-chapter-modal"
        role="dialog"
        aria-modal="true"
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
