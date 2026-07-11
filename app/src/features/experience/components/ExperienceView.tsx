import type { ReactNode } from "react";
import { useExperienceCtx } from "./experienceContext";
import { Banners } from "./Banners";
import { ThemeSwitch } from "./ThemeSwitch";
import { LockedChapterModal } from "./LockedChapterModal";
import { JourneyIndex } from "./IndexPage";
import { PreTrip, InProgress, Epilogue, MemoryMode, TripAlbum } from "./Modes";
import { StoryMode } from "@/features/story/engine/types";

// Espejo de renderExperience: decide la vista raíz, calcula rootClasses y el tema,
// y elige entre índice de lectura / álbum del viaje / modo actual. El <div> raíz
// es `.alaia-experience` (dentro de #app, igual que en experience.html).
export function ExperienceView() {
  const { view, theme, interactive, showingTripAlbum, showingPreparations, indexNavigationOpen } =
    useExperienceCtx();

  const readingIndexOpen =
    indexNavigationOpen &&
    !showingTripAlbum &&
    !showingPreparations &&
    view.currentMode !== StoryMode.PRE_TRIP;
  const themeablePage =
    showingTripAlbum || showingPreparations || view.currentMode !== StoryMode.PRE_TRIP;
  const rootClasses = [
    "alaia-experience",
    `alaia-theme-${theme}`,
    indexNavigationOpen ? "is-reading-index" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const usesReadingTopbar =
    showingTripAlbum ||
    showingPreparations ||
    (view.currentMode === StoryMode.IN_PROGRESS && Boolean(view.visibleChapter)) ||
    view.currentMode === StoryMode.EPILOGUE ||
    view.currentMode === StoryMode.MEMORY_MODE;
  const showThemeSwitch = interactive && themeablePage && !usesReadingTopbar;

  if (readingIndexOpen) {
    return (
      <div className={rootClasses} data-theme={theme}>
        <Banners />
        <JourneyIndex />
        <LockedChapterModal />
      </div>
    );
  }

  if (showingTripAlbum) {
    return (
      <div className={rootClasses} data-theme={theme}>
        {showThemeSwitch ? <ThemeSwitch /> : null}
        <Banners />
        <TripAlbum />
        <LockedChapterModal />
      </div>
    );
  }

  let content: ReactNode = null;
  switch (view.currentMode) {
    case StoryMode.PRE_TRIP:
      content = <PreTrip />;
      break;
    case StoryMode.IN_PROGRESS:
      content = <InProgress />;
      break;
    case StoryMode.EPILOGUE:
      content = <Epilogue />;
      break;
    case StoryMode.MEMORY_MODE:
      content = <MemoryMode />;
      break;
    default:
      throw new Error(`currentMode desconocido: ${view.currentMode}`);
  }

  return (
    <div className={rootClasses} data-theme={theme}>
      {showThemeSwitch ? <ThemeSwitch /> : null}
      <Banners />
      {content}
      <LockedChapterModal />
    </div>
  );
}
