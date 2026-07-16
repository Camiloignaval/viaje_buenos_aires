import { useEffect, useId, useRef, useState } from "react";
import {
  observeVisibleExperience,
  type VisibleCompanionExperienceViewModel,
  type VisibleExperienceObserver,
} from "../lib/visibleExperience";

type VisibleCompanionExperienceProps = Readonly<{
  viewModel: VisibleCompanionExperienceViewModel | null;
  observer?: VisibleExperienceObserver;
  onVisible?: () => boolean;
  onDismiss?: () => boolean;
}>;

export function VisibleCompanionExperience({
  viewModel,
  observer,
  onVisible,
  onDismiss,
}: VisibleCompanionExperienceProps) {
  const headingId = useId();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const visibleAttemptedRef = useRef(false);
  const renderedRef = useRef(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!viewModel || dismissed || visibleAttemptedRef.current) return;
    visibleAttemptedRef.current = true;
    try {
      if (onVisible?.() === false) return;
      setVisible(true);
    } catch {
      // A receipt that cannot be confirmed must never expose editorial content.
    }
  }, [dismissed, onVisible, viewModel]);

  useEffect(() => {
    if (!visible || dismissed || renderedRef.current) return;
    renderedRef.current = true;
    observeVisibleExperience(observer, "render_success");
  }, [dismissed, observer, visible]);

  if (!viewModel || !visible || dismissed) return null;

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    let persisted = true;
    try {
      persisted = onDismiss?.() !== false;
    } catch {
      persisted = false;
    }
    if (persisted) observeVisibleExperience(observer, "dismiss");
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
