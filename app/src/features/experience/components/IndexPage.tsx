import { useExperienceCtx } from "./experienceContext";
import { IntroParticles } from "./IntroParticles";
import { ChapterList } from "./ChapterList";
import { PreparationIndexEntry } from "./Preparations";
import { StoryMode } from "@/features/story/engine/types";

interface IndexPageProps {
  pendingReveal?: boolean;
  revealing?: boolean;
  extraClass?: string;
  showParticles?: boolean;
  returnMode?: boolean;
}

// Espejo de renderIndexPage: el índice de capítulos como página propia del libro.
export function IndexPage({
  pendingReveal = false,
  revealing = false,
  extraClass = "",
  showParticles = false,
  returnMode = false,
}: IndexPageProps) {
  const { view, storyPackage, interactive, preparationCompletedIds, actions } =
    useExperienceCtx();
  const classes = [
    "book-page",
    "page-index",
    extraClass,
    pendingReveal ? "page-index-pending" : "",
    revealing ? "is-revealing" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const completedIds = new Set(preparationCompletedIds);
  return (
    <section className={classes}>
      {showParticles ? <IntroParticles extraClass="index-particles" /> : null}
      <p className="eyebrow">Tu viaje</p>
      {view.currentMode === StoryMode.PRE_TRIP ? (
        <PreparationIndexEntry storyPackage={storyPackage} completedIds={completedIds} />
      ) : null}
      <h2 className="page-index-title">Capítulos</h2>
      <ChapterList />
      {returnMode && interactive ? (
        <p className="index-current-return">
          <button type="button" onClick={() => actions.resumeReading()}>
            Volver a la lectura →
          </button>
        </p>
      ) : null}
    </section>
  );
}

// Espejo de renderJourneyIndex: el índice cuando se abre "Capítulos" desde la lectura.
export function JourneyIndex() {
  const { view } = useExperienceCtx();
  return (
    <div className="book book-index-return">
      <IndexPage
        extraClass="page-index-return"
        returnMode={view.currentMode !== StoryMode.PRE_TRIP}
      />
    </div>
  );
}
