import { useExperienceCtx } from "./experienceContext";
import { ReadingTopbar } from "./ReadingTopbar";
import {
  computePreparationProgress,
  getPreparationGroups,
} from "../lib/preparations";
import type { PreparationGroup as PreparationGroupData, PreparationProgress } from "../lib/preparations";
import type { ChecklistItem, StoryPackage } from "@/features/story/engine/types";

// Espejo de renderPreparationProgress.
export function PreparationProgressBar({
  progress,
  className = "preparation-progress",
}: {
  progress: PreparationProgress;
  className?: string;
}) {
  const label = progress.complete ? "✓ Todo preparado" : "Preparando el viaje";
  return (
    <div className={className} aria-label={label} data-preparation-progress="">
      <span data-preparation-progress-label="">{label}</span>
      <span className="preparation-progress-line" aria-hidden="true">
        <span data-preparation-progress-fill="" style={{ width: `${progress.pct}%` }} />
      </span>
    </div>
  );
}

// Espejo de renderPreparationIndexEntry (devuelve la entrada + el divisor).
export function PreparationIndexEntry({
  storyPackage,
  completedIds,
}: {
  storyPackage: StoryPackage;
  completedIds: Set<string>;
}) {
  const { interactive, actions } = useExperienceCtx();
  const progress = computePreparationProgress(storyPackage, completedIds);
  if (progress.total === 0) {
    return null;
  }
  const statusLine = progress.complete
    ? "Todo quedó tranquilo."
    : "Nos estamos acercando al viaje.";
  const actionLabel = progress.complete ? "Volver a mirar →" : "Entrar →";
  const content = (
    <>
      <span className="preparation-index-title">Preparativos</span>
      <span className="preparation-index-status">{statusLine}</span>
      <PreparationProgressBar progress={progress} className="preparation-index-progress" />
      <span className="preparation-index-action">{actionLabel}</span>
    </>
  );
  return (
    <>
      <section className="preparation-index-entry" aria-label="Preparativos">
        {interactive ? (
          <button
            type="button"
            className="preparation-index-link"
            onClick={() => actions.openPreparations()}
          >
            {content}
          </button>
        ) : (
          content
        )}
      </section>
      <span className="index-section-divider" aria-hidden="true" />
    </>
  );
}

function PreparationItem({
  item,
  checked,
}: {
  item: ChecklistItem;
  checked: boolean;
}) {
  const { interactive, actions } = useExperienceCtx();
  const content = (
    <>
      <span className="preparation-check-mark" aria-hidden="true">
        {checked ? "✓" : ""}
      </span>
      <span className="preparation-check-label">{item.label}</span>
    </>
  );
  if (!interactive) {
    return (
      <li>
        <div className={`preparation-check-row${checked ? " is-complete" : ""}`}>{content}</div>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        className={`preparation-check-row${checked ? " is-complete" : ""}`}
        data-preparation-id={item.id}
        data-title={item.label}
        data-category={item.category}
        data-completed={String(checked)}
        aria-pressed={checked}
        onClick={() =>
          actions.togglePreparation({
            id: item.id,
            title: item.label,
            category: item.category,
            completed: !checked,
          })
        }
      >
        {content}
      </button>
    </li>
  );
}

function PreparationGroup({
  group,
  completedIds,
}: {
  group: PreparationGroupData;
  completedIds: Set<string>;
}) {
  const done = group.items.filter((item) => completedIds.has(item.id)).length;
  const complete = done === group.items.length;
  return (
    <section
      className={`preparation-group${complete ? " is-complete" : ""}`}
      data-preparation-group=""
      data-reveal-on-scroll=""
      data-total={group.items.length}
    >
      <div className="preparation-group-head">
        <h2>
          <span className="preparation-group-title">{group.label}</span>
        </h2>
        <span data-preparation-group-count="">{complete ? "✓" : "en calma"}</span>
      </div>
      <ul className="preparation-checklist">
        {group.items.map((item) => (
          <PreparationItem key={item.id} item={item} checked={completedIds.has(item.id)} />
        ))}
      </ul>
    </section>
  );
}

// Espejo de renderPreparationsPage.
export function PreparationsPage() {
  const { storyPackage, interactive, preparationCompletedIds } = useExperienceCtx();
  const completedIds = new Set(preparationCompletedIds);
  const groups = getPreparationGroups(storyPackage);
  const progress = computePreparationProgress(storyPackage, completedIds);
  return (
    <div className="book book-pretrip book-preparations-mode">
      <section className="book-page page-preparations">
        {interactive ? (
          <ReadingTopbar
            label="← Volver al índice"
            action="close-preparations"
            extraClass="preparation-topbar"
          />
        ) : null}
        <p className="eyebrow reveal reveal-1">Antes del viaje</p>
        <h1 className="reveal reveal-2">Preparativos</h1>
        <p className="open preparation-intro reveal reveal-3">
          Todo viaje empieza antes del avión.
          <br />
          Antes de salir, dejemos cerca lo esencial para que la historia pueda comenzar tranquila.
        </p>
        <div className="reveal reveal-4">
          <PreparationProgressBar progress={progress} className="preparation-page-progress" />
          <p
            className={`preparation-complete-copy${progress.complete ? "" : " is-hidden"}`}
            data-preparation-complete-copy=""
          >
            Ahora solo queda esperar el comienzo del viaje.
          </p>
        </div>
        <div className="preparation-groups">
          {groups.map((group) => (
            <PreparationGroup key={group.sourceCategory} group={group} completedIds={completedIds} />
          ))}
        </div>
        <section className="preparation-afterword">
          <p>Algunas páginas todavía esperan su momento.</p>
          <p>Alaia las abrirá cuando empiece el viaje.</p>
        </section>
      </section>
    </div>
  );
}
