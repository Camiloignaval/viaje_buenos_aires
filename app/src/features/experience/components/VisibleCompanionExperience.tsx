import { useEffect, useId, useRef, useState } from "react";
import {
  observeVisibleExperience,
  type VisibleCompanionExperienceViewModel,
  type VisibleExperienceObserver,
} from "../lib/visibleExperience";

type VisibleCompanionExperienceProps = Readonly<{
  viewModel: VisibleCompanionExperienceViewModel | null;
  observer?: VisibleExperienceObserver;
}>;

export function VisibleCompanionExperience({
  viewModel,
  observer,
}: VisibleCompanionExperienceProps) {
  const headingId = useId();
  const [dismissed, setDismissed] = useState(false);
  const renderedRef = useRef(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!viewModel || dismissed || renderedRef.current) return;
    renderedRef.current = true;
    observeVisibleExperience(observer, "render_success");
  }, [dismissed, observer, viewModel]);

  if (!viewModel || dismissed) return null;

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    observeVisibleExperience(observer, "dismiss");
    setDismissed(true);
  };

  return (
    <aside className="visible-companion-experience" aria-labelledby={headingId}>
      <span className="visible-companion-experience-decoration" aria-hidden="true">✦</span>
      <div className="visible-companion-experience-content">
        <h3 id={headingId}>{viewModel.label}</h3>
        <p>{viewModel.text}</p>
      </div>
      <button
        className="visible-companion-experience-close"
        type="button"
        aria-label="Cerrar mensaje de Alaia"
        onClick={dismiss}
      >
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  );
}
