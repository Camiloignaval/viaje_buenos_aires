import { useExperienceCtx } from "./experienceContext";
import { IndexPage } from "./IndexPage";
import { PreparationsPage } from "./Preparations";
import { IntroIndexStage, ReplayIntroButton, StaticCover } from "./Cover";
import { ReadingTopbar } from "./ReadingTopbar";
import { PromptSlot } from "./EpiloguePrompts";
import {
  ActionButton,
  ActivityCard,
  AlbumLink,
  ChapterAlbum,
  ChapterHero,
  ClosingMessage,
  CollectionItems,
  GeneralMemories,
  MicroDiscoveries,
  NightNote,
  OurMoment,
  PhotoSpots,
  RelatedPlaces,
  Traditions,
} from "./ChapterSections";
import { MemoryCard } from "./Memories";
import { resolveChapterContent } from "@/features/story/engine/chapterContent";
import { getChapterReferenceDate } from "@/features/story/engine/storyProgress";
import { ChapterStatus } from "@/features/story/engine/types";
import type { Chapter, SpecialChapter } from "@/features/story/engine/types";
import type { Memory } from "@/features/album/data/types";
import { byCreatedAt, groupMemoriesByActivity, mostRecent } from "../lib/memoryGrouping";
import { photoSlotKey } from "../lib/photoSlot";
import { formatChapterDate } from "../lib/format";

// Espejo de renderPreTrip.
export function PreTrip() {
  const { showingPreparations, coverIntroState } = useExperienceCtx();
  if (showingPreparations) {
    return <PreparationsPage />;
  }
  if (
    coverIntroState === "video" ||
    coverIntroState === "revealing" ||
    coverIntroState === "done"
  ) {
    return <IntroIndexStage />;
  }
  return (
    <div className="book book-pretrip">
      <ReplayIntroButton />
      <StaticCover />
      <IndexPage />
    </div>
  );
}

// Espejo de renderInProgress.
export function InProgress() {
  const { view, storyPackage, memories, stagedPhotosBySlot } = useExperienceCtx();
  const chapter = view.visibleChapter;

  if (!chapter) {
    // Ya se cerró un capítulo y el siguiente todavía no amanece — nunca vacío.
    return (
      <div className="book">
        <section className="book-page page-chapter page-closing">
          <ClosingMessage view={view} storyPackage={storyPackage} />
        </section>
        <IndexPage />
      </div>
    );
  }

  const openLine = chapter.copy?.open ?? storyPackage.baseCopy.dailyOpenTemplate;
  const content = resolveChapterContent(storyPackage, chapter);
  const { byActivityId, general } = groupMemoriesByActivity(memories);
  const generalStaged = stagedPhotosBySlot.get(photoSlotKey(chapter.id, null)) ?? [];

  return (
    <div className="book">
      <section className="book-page page-chapter">
        <div className="chapter">
          <ChapterHero chapter={chapter} openLine={openLine} />
          <ul className="activities">
            {content.activitiesWithPlaces.map((entry) => (
              <ActivityCard
                key={entry.activity.id}
                entry={entry}
                chapterId={chapter.id}
                memoriesByActivityId={byActivityId}
              />
            ))}
          </ul>
          <RelatedPlaces places={content.relatedPlaces} chapterId={chapter.id} />
          <PhotoSpots spots={content.photoSpots} chapterId={chapter.id} />
          <CollectionItems items={content.collectionItems} chapterId={chapter.id} />
          <Traditions traditions={chapter.traditions} chapterId={chapter.id} />
          <MicroDiscoveries discoveries={chapter.microDiscoveries} chapterId={chapter.id} />
          <OurMoment ourMoment={chapter.ourMoment} chapterId={chapter.id} />
          <ChapterAlbum memories={memories} chapterId={chapter.id} />
          <GeneralMemories
            chapterId={chapter.id}
            unassignedSuggestedMemories={content.unassignedSuggestedMemories}
            generalMemories={general}
            staged={generalStaged}
          />
          <NightNote nightNote={chapter.nightNote} chapterId={chapter.id} />
          <ActionButton chapterId={chapter.id} status={chapter.status} />
        </div>
        <AlbumLink />
      </section>
      <IndexPage />
    </div>
  );
}

// Espejo de renderEpilogue.
export function Epilogue() {
  const { view, storyPackage, interactive, memories } = useExperienceCtx();
  const specialChapter = storyPackage.specialChapter as SpecialChapter;

  if (view.specialChapterStatus === ChapterStatus.LOCKED) {
    const date = formatChapterDate(getChapterReferenceDate(specialChapter, storyPackage));
    return (
      <div className="book">
        <section className="book-page page-epilogue epilogue-waiting">
          <ReadingTopbar />
          <p className="eyebrow">{date}</p>
          <p className="open">Nos espera.</p>
        </section>
        <IndexPage />
      </div>
    );
  }

  const { byActivityId } = groupMemoriesByActivity(memories);
  return (
    <div className="book">
      <section className="book-page page-epilogue">
        <ReadingTopbar />
        <h1 className="reveal reveal-1">{specialChapter.title}</h1>
        <p className="open reveal reveal-2">{specialChapter.copy?.open ?? ""}</p>
        <ul className="prompts">
          {interactive
            ? (specialChapter.prompts ?? []).map((prompt) => (
                <li key={prompt.id}>
                  <PromptSlot
                    prompt={prompt}
                    chapterId={specialChapter.id}
                    existingMemory={mostRecent(byActivityId.get(prompt.id))}
                    storyPackage={storyPackage}
                  />
                </li>
              ))
            : null}
        </ul>
        <ActionButton
          chapterId={specialChapter.id}
          status={view.specialChapterStatus ?? ChapterStatus.AVAILABLE}
          options={{
            confirmQuestion: "Esto va a cerrar el viaje. ¿Quieres guardarlo así, tal como fue?",
            confirmLabel: "Sí, guardar así",
            cancelLabel: "Seguir un poco más",
            startLabel: "Abrir el cierre",
            closeLabel: "Cerrar el viaje",
          }}
        />
        <AlbumLink />
      </section>
      <IndexPage />
    </div>
  );
}

// Espejo de renderMemoryMode.
export function MemoryMode() {
  const { storyPackage, justTransformed } = useExperienceCtx();
  const title = storyPackage.metadata.title;
  const letter = storyPackage.baseCopy.finalLetter ?? "";
  return (
    <div className="book">
      <section className="book-page page-memory">
        <ReadingTopbar />
        {justTransformed ? (
          <>
            <p className="transformation-line reveal reveal-1">
              Esta historia se convirtió en un recuerdo.
            </p>
            <p className="eyebrow reveal reveal-2">{title}</p>
            <p className="letter reveal reveal-3">{letter}</p>
          </>
        ) : (
          <>
            <p className="eyebrow reveal reveal-1">{title}</p>
            <p className="letter reveal reveal-2">{letter}</p>
          </>
        )}
        <AlbumLink label="Ver lo que quedó de Buenos Aires" />
      </section>
      <IndexPage />
    </div>
  );
}

// Espejo de renderTripAlbum.
export function TripAlbum() {
  const { storyPackage, tripMemories } = useExperienceCtx();
  const allChapters: Chapter[] = [
    ...storyPackage.chapters,
    ...(storyPackage.specialChapter ? [storyPackage.specialChapter] : []),
  ];
  const byChapter = new Map<string, Memory[]>();
  for (const memory of tripMemories) {
    if (memory.archived) {
      continue;
    }
    const list = byChapter.get(memory.chapterId) ?? [];
    list.push(memory);
    byChapter.set(memory.chapterId, list);
  }

  const chaptersWithMemories = allChapters.filter(
    (chapter) => (byChapter.get(chapter.id) ?? []).length > 0,
  );

  return (
    <div className="book">
      <section className="book-page page-album">
        <ReadingTopbar />
        <p className="eyebrow reveal reveal-1">{storyPackage.metadata.title}</p>
        <h1 className="reveal reveal-2">Nuestro Buenos Aires</h1>
        <p className="open reveal reveal-3">Lo que quedó del viaje, tal como decidió quedarse.</p>
        {chaptersWithMemories.length > 0 ? (
          chaptersWithMemories.map((chapter) => {
            const { byActivityId, general } = groupMemoriesByActivity(byChapter.get(chapter.id) ?? []);
            const perActivity = [...byActivityId.values()]
              .map(mostRecent)
              .filter((m): m is Memory => m !== null);
            const cards = [...perActivity, ...general].sort(byCreatedAt);
            return (
              <section key={chapter.id} className="album-chapter">
                <p className="section-title">{chapter.title}</p>
                <ul className="memory-cards">
                  {cards.map((memory) => (
                    <MemoryCard key={memory.id} memory={memory} />
                  ))}
                </ul>
              </section>
            );
          })
        ) : (
          <p className="album-empty">
            Todavía no hay recuerdos guardados. Buenos Aires igual ya quedó en la historia.
          </p>
        )}
      </section>
      <IndexPage returnMode />
    </div>
  );
}
