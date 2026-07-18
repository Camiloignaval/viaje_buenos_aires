import { useExperienceCtx } from "./experienceContext";
import { IndexPage } from "./IndexPage";
import { PreparationsPage } from "./Preparations";
import { IntroIndexStage, ReplayIntroButton, StaticCover } from "./Cover";
import { ReadingTopbar } from "./ReadingTopbar";
import { PromptSlot } from "./EpiloguePrompts";
import { Fragment } from "react";
import {
  ActionButton,
  ActivityPage,
  AlbumLink,
  ArrivalThreshold,
  ChapterHero,
  ClosingMessage,
  GeneralMemories,
  IndexReturnLink,
  NightNote,
  OurMoment,
  PhaseTitle,
  SceneFilete,
} from "./ChapterSections";
import { MemoryCard } from "./Memories";
import { ChapterActivitySequence } from "./ChapterActivitySequence";
import { VisibleCompanionExperience } from "./VisibleCompanionExperience";
import { LivingMemoryMoment } from "./LivingMemoryMoment";
import { resolveChapterContent } from "@/features/story/engine/chapterContent";
import { getChapterReferenceDate } from "@/features/story/engine/storyProgress";
import { ChapterStatus } from "@/features/story/engine/types";
import type { Chapter, SpecialChapter } from "@/features/story/engine/types";
import type { Memory } from "@/features/album/data/types";
import { groupMemoriesByActivity, mostRecent } from "../lib/memoryGrouping";
import { groupMemoriesByChapter } from "../lib/albumGrouping";
import { photoSlotKey } from "../lib/photoSlot";
import { formatChapterDate } from "../lib/format";
import { assignPhotoSpots, resolveDayPassageLayouts } from "../lib/dayLived";

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
  const { view, storyPackage, memories, stagedPhotosBySlot, contextualCompanion, chapterStatuses, actions } =
    useExperienceCtx();
  const chapter = view.visibleChapter;

  if (!chapter) {
    // Ya se cerró un capítulo y el siguiente todavía no amanece — nunca vacío.
    return (
      <div className="book">
        <section className="book-page page-chapter page-closing">
          <ClosingMessage view={view} storyPackage={storyPackage} />
        </section>
      </div>
    );
  }

  const openLine = chapter.copy?.open ?? storyPackage.baseCopy.dailyOpenTemplate;
  const content = resolveChapterContent(storyPackage, chapter);
  const { byActivityId, general } = groupMemoriesByActivity(memories);
  const generalStaged = stagedPhotosBySlot.get(photoSlotKey(chapter.id, null)) ?? [];
  const ourMomentId = `${chapter.id}::our-moment`;
  const ourMomentMemory = mostRecent(byActivityId.get(ourMomentId));
  const ourMomentStaged = stagedPhotosBySlot.get(photoSlotKey(chapter.id, ourMomentId)) ?? [];
  const activities = content.activitiesWithPlaces;
  // La fecha del sello es la del día del viaje (tiempo narrado), no el created-at.
  const dayStamp = formatChapterDate(getChapterReferenceDate(chapter, storyPackage));
  const layouts = resolveDayPassageLayouts(activities.map(({ activity }) => activity));
  // Cada photoSpot del capítulo se ancla a su actividad (por título/lugar) para
  // aparecer cerca de su momento, nunca todos juntos en una sección aparte.
  const photoSpotByActivityId = assignPhotoSpots(
    activities.map(({ activity }) => activity),
    content.photoSpots,
  );
  const walkingIndex = layouts.findIndex(({ composition }) => composition === "caminado");
  const firstGastronomyIndex = activities.findIndex(({ activity }) =>
    /gastronom[ií]a|comida|almuerzo|cena/i.test(`${activity.category ?? ""} ${activity.title}`),
  );
  const lastPassageIndex = activities.length - 1;
  const memoryEnabled = chapter.status === ChapterStatus.STARTED;
  const lastPassage = activities[lastPassageIndex];
  const lastPassageCost = lastPassage?.activity.practical?.estimatedCost ?? lastPassage?.place?.estimatedCost;
  const lastPassagePlaceName = lastPassage?.place?.name?.toLocaleLowerCase("es-AR");
  // Una pieza de colección que nombra al mismo lugar y vuelve a repetir su precio
  // no aporta contexto: el monto queda en Datos prácticos, su fuente editorial.
  const lastPassageCollectionItems = content.collectionItems.filter((item) => {
    if (!lastPassageCost || !lastPassagePlaceName) return true;
    const itemContext = `${item.name} ${item.suggestedWhereToBuy ?? ""}`.toLocaleLowerCase("es-AR");
    return !itemContext.includes(lastPassagePlaceName);
  });

  // ---- Umbral de llegada (Fase 4) ----
  // Mientras no se abra el destino, solo respira la fase de partida (aeropuerto,
  // vuelo, instantes de tránsito). Abrir Buenos Aires reutiliza la ceremonia de
  // progreso existente: start("<chapter>::arrival"). Una vez abierto, el mismo
  // progreso lo mantiene abierto para siempre — nunca se vuelve a cerrar.
  const arrivalGate = chapter.arrivalGate;
  const arrivalKey = `${chapter.id}::arrival`;
  const arrivalOpened = !arrivalGate || chapterStatuses[arrivalKey] === ChapterStatus.STARTED;
  const firstArrivedIndex = arrivalGate
    ? activities.findIndex(({ activity }) => activity.narrativePhase !== "departure")
    : -1;
  const arrivalPhaseCopy = chapter.narrativePhases?.find((phase) => phase.id === "arrival")?.copy;

  if (chapter.status === ChapterStatus.AVAILABLE) {
    return (
      <div className="book">
        <section className="book-page page-chapter page-chapter-sealed">
          <div className="chapter">
            <ChapterHero chapter={chapter} openLine={openLine} />
            <p className="sealed-line">Nos espera.</p>
            <ActionButton chapterId={chapter.id} status={chapter.status} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="book">
      <section className="book-page page-chapter">
        <div className="chapter">
          <ChapterHero chapter={chapter} openLine={openLine} />
          <ChapterActivitySequence chapterTitle={chapter.title}>
            {activities.map((entry, index) => {
              // Del otro lado del umbral hasta que se abra Buenos Aires.
              if (!arrivalOpened && entry.activity.narrativePhase !== "departure") return null;
              const page = (
                <ActivityPage
                  key={entry.activity.id}
                  entry={entry}
                  chapterId={chapter.id}
                  memoriesByActivityId={byActivityId}
                  composition={layouts[index]?.composition}
                  centered={layouts[index]?.centered}
                  showReferencePhoto={layouts[index]?.showReferencePhoto}
                  memoryEnabled={memoryEnabled}
                  dateLabel={dayStamp}
                  traditions={index === firstGastronomyIndex ? chapter.traditions : undefined}
                  discoveries={index === walkingIndex ? chapter.microDiscoveries : undefined}
                  collectionItems={index === lastPassageIndex ? lastPassageCollectionItems : undefined}
                  relatedPlaces={index === lastPassageIndex ? content.relatedPlaces : undefined}
                  notes={
                    index === walkingIndex
                      ? [
                          ...(chapter.planB ? [{ label: "Si el día cambia", text: chapter.planB }] : []),
                          ...(chapter.extraTime ? [{ label: "Si queda tiempo", text: chapter.extraTime }] : []),
                        ]
                      : undefined
                  }
                  photoSpot={photoSpotByActivityId.get(entry.activity.id)}
                  companion={
                    index === walkingIndex && contextualCompanion?.viewModel ? (
                      <VisibleCompanionExperience
                        viewModel={contextualCompanion.viewModel}
                        observer={contextualCompanion.observer}
                        onVisible={contextualCompanion.onVisible}
                        onDismiss={contextualCompanion.onDismiss}
                      />
                    ) : null
                  }
                />
              );
              // Al abrir, la fase de llegada se anuncia como una nueva portada del día.
              if (arrivalOpened && arrivalGate && index === firstArrivedIndex) {
                return (
                  <Fragment key={`arrival-${entry.activity.id}`}>
                    <PhaseTitle title={chapter.arrivalTitle} copy={arrivalPhaseCopy} />
                    {page}
                  </Fragment>
                );
              }
              return page;
            })}
            {arrivalGate && !arrivalOpened ? (
              <ArrivalThreshold gate={arrivalGate} onOpen={() => actions.start(arrivalKey)} />
            ) : null}
          </ChapterActivitySequence>
          {arrivalOpened ? (
            <>
              <OurMoment
                ourMoment={chapter.ourMoment}
                chapterId={chapter.id}
                existingMemory={ourMomentMemory}
                staged={ourMomentStaged}
                memoryEnabled={memoryEnabled}
                dateLabel={dayStamp}
              />
              <GeneralMemories
                chapterId={chapter.id}
                unassignedSuggestedMemories={content.unassignedSuggestedMemories}
                generalMemories={general}
                staged={generalStaged}
                memoryEnabled={memoryEnabled}
                dateLabel={dayStamp}
              />
              <NightNote nightNote={chapter.nightNote} chapterId={chapter.id} folio={chapter.order} />
              <ActionButton chapterId={chapter.id} status={chapter.status} />
            </>
          ) : null}
        </div>
        <footer className="chapter-colophon">
          <SceneFilete />
          <AlbumLink />
          <IndexReturnLink />
        </footer>
      </section>
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
        <AlbumLink />
      </section>
    </div>
  );
}

// Espejo de renderTripAlbum.
export function TripAlbum() {
  const { storyPackage, tripMemories, semanticMemoryScope } = useExperienceCtx();
  const allChapters: Chapter[] = [
    ...storyPackage.chapters,
    ...(storyPackage.specialChapter ? [storyPackage.specialChapter] : []),
  ];
  const chapterById = new Map(allChapters.map((chapter) => [chapter.id, chapter]));
  const albumGroups = groupMemoriesByChapter(tripMemories, storyPackage);

  return (
    <div className="book">
      <section className="book-page page-album">
        <ReadingTopbar />
        <p className="eyebrow reveal reveal-1">{storyPackage.metadata.title}</p>
        <h1 className="reveal reveal-2">Nuestros recuerdos</h1>
        <p className="open reveal reveal-3">Los momentos que quisimos guardar, tal como quedaron con nosotros.</p>
        {semanticMemoryScope ? <LivingMemoryMoment {...semanticMemoryScope} /> : null}
        {albumGroups.length > 0 ? (
          albumGroups.map((group) => {
            const chapter = chapterById.get(group.chapterId);
            return (
              <section key={group.chapterId} className="album-chapter">
                <p className="section-title">{group.title}</p>
                <ul className="memory-cards">
                  {group.memories.map((memory) => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      contextLabel={memoryContextLabel(chapter, memory)}
                    />
                  ))}
                </ul>
              </section>
            );
          })
        ) : (
          <p className="album-empty">
            Todavía no guardaron ningún momento. Este viaje igual ya forma parte de su historia.
          </p>
        )}
      </section>
    </div>
  );
}

function memoryContextLabel(chapter: Chapter | undefined, memory: Memory): string | undefined {
  if (!memory.activityId) return "Un momento del día";
  const activity = chapter?.activities?.find((candidate) => candidate.id === memory.activityId);
  if (activity) {
    return activity.moment ? `${activity.moment}. ${activity.title}` : activity.title;
  }
  const prompt = (chapter as SpecialChapter | undefined)?.prompts?.find(
    (candidate) => candidate.id === memory.activityId,
  );
  return prompt?.label;
}
