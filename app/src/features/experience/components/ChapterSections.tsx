import { Fragment } from "react";
import { useExperienceCtx } from "./experienceContext";
import { Links } from "./Links";
import { SavedMemory, MemoryInvitation, MemoryCard } from "./Memories";
import { ChapterTopbar } from "./ReadingTopbar";
import { formatChapterDate, toRoman } from "../lib/format";
import { heroImageForChapter } from "../lib/chapterSummary";
import { byCreatedAt, groupMemoriesByActivity, mostRecent } from "../lib/memoryGrouping";
import { photoSlotKey } from "../lib/photoSlot";
import { getChapterReferenceDate } from "@/features/story/engine/storyProgress";
import { ChapterStatus } from "@/features/story/engine/types";
import type {
  Activity,
  Chapter,
  ChapterStatusValue,
  CollectionItem,
  Place,
  PhotoSpot,
  StoryPackage,
  SuggestedMemory,
  Tradition,
} from "@/features/story/engine/types";
import type { ActivityWithPlace } from "@/features/story/engine/chapterContent";
import type { Memory } from "@/features/album/data/types";

function resolveLocation(activity: Activity, place: Place | null) {
  return activity.location ?? place?.location ?? null;
}
function resolveWebsiteUrl(activity: Activity, place: Place | null) {
  return activity.websiteUrl ?? place?.websiteUrl ?? null;
}

// Espejo de renderRelatedPlaces ("En el camino").
export function RelatedPlaces({ places, chapterId }: { places: Place[]; chapterId: string }) {
  if (places.length === 0) return null;
  return (
    <section className="related-places" data-reveal-on-scroll="" data-reveal-key={`chapter-${chapterId}-related-places`}>
      <p className="section-title">En el camino</p>
      <ul>
        {places.map((place) => (
          <li key={place.id}>
            <p className="place-name">{place.name}</p>
            {place.recommendation ? <p className="recommendation">{place.recommendation}</p> : null}
            <Links location={place.location} websiteUrl={place.websiteUrl} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// Espejo de renderPhotoSpots ("Postales posibles").
export function PhotoSpots({ spots, chapterId }: { spots: PhotoSpot[]; chapterId: string }) {
  if (spots.length === 0) return null;
  return (
    <section className="photo-spots" data-reveal-on-scroll="" data-reveal-key={`chapter-${chapterId}-photo-spots`}>
      <p className="section-title">Postales posibles</p>
      <ul>
        {spots.map((spot) => (
          <li key={spot.id}>
            <p className="spot-title">{spot.title}</p>
            {spot.bestTime ? <p className="spot-time">{spot.bestTime}</p> : null}
            {spot.tip ? <p className="spot-tip">{spot.tip}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Espejo de renderCollectionItems ("Para llevar del día").
export function CollectionItems({ items, chapterId }: { items: CollectionItem[]; chapterId: string }) {
  if (items.length === 0) return null;
  return (
    <section className="collection-items" data-reveal-on-scroll="" data-reveal-key={`chapter-${chapterId}-collection-items`}>
      <p className="section-title">Para llevar del día</p>
      <ul>
        {items.map((item) => {
          const priceLine = [item.suggestedWhereToBuy, item.estimatedPrice].filter(Boolean).join(" — ");
          return (
            <li key={item.id}>
              <p className="item-name">{item.name}</p>
              {item.description ? <p className="item-description">{item.description}</p> : null}
              {priceLine ? <p className="item-description">{priceLine}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Espejo de renderTraditions ("Pequeñas tradiciones").
export function Traditions({ traditions, chapterId }: { traditions?: Tradition[]; chapterId: string }) {
  if (!traditions || traditions.length === 0) return null;
  return (
    <section className="traditions" data-reveal-on-scroll="" data-reveal-key={`chapter-${chapterId}-traditions`}>
      <p className="section-title">Pequeñas tradiciones</p>
      <ul>
        {traditions.map((tradition, index) => (
          <li key={index}>
            <p className="item-name">{tradition.title}</p>
            <p className="item-description">{tradition.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Espejo de renderMicroDiscoveries ("Pequeños descubrimientos").
export function MicroDiscoveries({ discoveries, chapterId }: { discoveries?: string[]; chapterId: string }) {
  if (!discoveries || discoveries.length === 0) return null;
  return (
    <section className="micro-discoveries" data-reveal-on-scroll="" data-reveal-key={`chapter-${chapterId}-micro-discoveries`}>
      <p className="section-title">Pequeños descubrimientos</p>
      <ul>
        {discoveries.map((discovery, index) => (
          <li key={index}>
            <p className="item-description">{discovery}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Espejo de renderOurMoment ("Nuestro momento").
export function OurMoment({ ourMoment, chapterId }: { ourMoment?: string; chapterId: string }) {
  if (!ourMoment) return null;
  return (
    <section className="our-moment" data-reveal-on-scroll="" data-reveal-key={`chapter-${chapterId}-our-moment`}>
      <p className="section-title">Nuestro momento</p>
      <p className="our-moment-copy">{ourMoment}</p>
    </section>
  );
}

// Espejo de renderNightNote.
export function NightNote({ nightNote, chapterId }: { nightNote?: string; chapterId: string }) {
  if (!nightNote) return null;
  return (
    <section className="night-note" data-reveal-on-scroll="" data-reveal-key={`chapter-${chapterId}-night-note`}>
      <p className="section-title">🌙 Antes de terminar el día</p>
      <p className="item-description">{nightNote}</p>
    </section>
  );
}

// Espejo de renderChapterAlbum ("Lo que ya quedó").
export function ChapterAlbum({ memories, chapterId }: { memories: Memory[]; chapterId: string }) {
  const { interactive } = useExperienceCtx();
  if (!interactive) return null;
  const { byActivityId, general } = groupMemoriesByActivity(memories);
  const perActivity = [...byActivityId.values()].map(mostRecent).filter((m): m is Memory => m !== null);
  const visible = [...perActivity, ...general];
  if (visible.length === 0) return null;
  const sorted = [...visible].sort(byCreatedAt);
  return (
    <section className="chapter-album" data-reveal-on-scroll="" data-reveal-key={`chapter-${chapterId}-album`}>
      <p className="section-title">Lo que ya quedó</p>
      <ul className="memory-cards">
        {sorted.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </ul>
    </section>
  );
}

// Espejo de renderGeneralMemories ("Algo más de hoy").
export function GeneralMemories({
  chapterId,
  unassignedSuggestedMemories,
  generalMemories,
  staged,
}: {
  chapterId: string;
  unassignedSuggestedMemories: SuggestedMemory[];
  generalMemories: Memory[];
  staged: import("../lib/photoSlot").StagedPhoto[];
}) {
  const { interactive } = useExperienceCtx();
  if (!interactive) return null;
  return (
    <section className="chapter-memories-general" data-reveal-on-scroll="" data-reveal-key={`chapter-${chapterId}-general-memories`}>
      <p className="section-title">Algo más de hoy</p>
      {unassignedSuggestedMemories.map((memory) => (
        <p key={memory.id} className="memory-invitation-hint">
          {memory.prompt}
        </p>
      ))}
      {generalMemories.map((memory) => (
        <SavedMemory key={memory.id} memory={memory} />
      ))}
      <MemoryInvitation
        chapterId={chapterId}
        activityId={null}
        question="¿Algo más de hoy que quieras guardar?"
        staged={staged}
      />
    </section>
  );
}

// Espejo de renderAlbumLink.
export function AlbumLink({ label = "Ver recuerdos del viaje" }: { label?: string }) {
  const { interactive, actions } = useExperienceCtx();
  if (!interactive) return null;
  return (
    <p className="album-link" data-reveal-on-scroll="" data-reveal-key="chapter-album-link">
      <button type="button" onClick={() => actions.openAlbum()}>
        {label}
      </button>
    </p>
  );
}

// Espejo de renderClosingMessage.
export function ClosingMessage({ view, storyPackage }: { view: import("@/features/story/engine/types").StoryView; storyPackage: StoryPackage }) {
  const lastClosed = storyPackage.chapters
    .filter((chapter) => view.completedChapters.includes(chapter.id))
    .sort((a, b) => b.order - a.order)[0];
  if (!lastClosed) return null;
  const closeLine = lastClosed.copy?.close ?? storyPackage.baseCopy.dailyCloseTemplate;
  return (
    <section className="chapter-closing">
      <p className="eyebrow reveal reveal-1">{lastClosed.title}</p>
      <p className="open reveal reveal-2">{closeLine}</p>
    </section>
  );
}

// Espejo de renderActivityMemorySlot.
function ActivityMemorySlot({
  chapterId,
  activity,
  suggestedMemories,
  existingMemory,
  staged,
}: {
  chapterId: string;
  activity: Activity;
  suggestedMemories: SuggestedMemory[];
  existingMemory: Memory | null;
  staged: import("../lib/photoSlot").StagedPhoto[];
}) {
  const { interactive } = useExperienceCtx();
  if (!interactive) return null;
  if (existingMemory) {
    return <SavedMemory memory={existingMemory} />;
  }
  const hasHint = suggestedMemories.length > 0;
  return (
    <MemoryInvitation
      chapterId={chapterId}
      activityId={activity.id}
      question={hasHint ? "¿Hay algo de esto que quieras guardar?" : ""}
      hint={hasHint ? suggestedMemories.map((memory) => memory.prompt).join(" · ") : ""}
      staged={staged}
      quiet={!hasHint}
    />
  );
}

// Espejo de renderActivityCard.
export function ActivityCard({
  entry,
  chapterId,
  memoriesByActivityId,
}: {
  entry: ActivityWithPlace;
  chapterId: string;
  memoriesByActivityId: Map<string, Memory[]>;
}) {
  const { stagedPhotosBySlot } = useExperienceCtx();
  const { activity, place, suggestedMemories } = entry;
  const location = resolveLocation(activity, place);
  const websiteUrl = resolveWebsiteUrl(activity, place);
  const existingMemory = mostRecent(memoriesByActivityId.get(activity.id));
  const staged = stagedPhotosBySlot.get(photoSlotKey(chapterId, activity.id)) ?? [];
  return (
    <li className="activity-card" data-reveal-on-scroll="" data-reveal-key={`chapter-${chapterId}-activity-${activity.id}`}>
      {activity.image ? (
        <img className="activity-photo" src={`/${activity.image}`} alt={activity.moment ?? activity.title} loading="lazy" />
      ) : null}
      <p className="activity-title">
        {activity.moment ? (
          <Fragment>
            <em>{activity.moment}.</em>{" "}
          </Fragment>
        ) : null}
        {activity.title}
      </p>
      {activity.description ? <p className="activity-description">{activity.description}</p> : null}
      <div className="activity-head">
        {activity.timeWindow ? <span className="time">{activity.timeWindow}</span> : null}
        {activity.category ? <span className="category">{activity.category}</span> : null}
      </div>
      {location?.name ? <p className="location">{location.name}</p> : null}
      {place?.recommendation ? <p className="recommendation">{place.recommendation}</p> : null}
      <Links location={location} websiteUrl={websiteUrl} />
      <ActivityMemorySlot
        chapterId={chapterId}
        activity={activity}
        suggestedMemories={suggestedMemories}
        existingMemory={existingMemory}
        staged={staged}
      />
    </li>
  );
}

// Espejo de renderChapterHero.
export function ChapterHero({ chapter, openLine }: { chapter: Chapter; openLine: string }) {
  const { storyPackage } = useExperienceCtx();
  const chapterDate = formatChapterDate(getChapterReferenceDate(chapter, storyPackage)).toUpperCase();
  return (
    <div className="chapter-hero">
      <div className="chapter-hero-frame reveal reveal-1">
        <ChapterTopbar />
        <img className="chapter-hero-image" src={heroImageForChapter(chapter)} alt="" loading="eager" />
        <div className="chapter-hero-copy reveal reveal-2">
          <p className="chapter-hero-kicker">
            CAPÍTULO {toRoman(chapter.order)} · {chapterDate}
          </p>
          <h1>{chapter.title}</h1>
          <p className="open">{openLine}</p>
        </div>
      </div>
    </div>
  );
}

interface ActionButtonOptions {
  useConfirmation?: boolean;
  confirmQuestion?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  startLabel?: string;
  closeLabel?: string;
}

// Espejo de renderActionButton (abrir / cerrar con ritual de confirmación cálida).
export function ActionButton({
  chapterId,
  status,
  options = {},
}: {
  chapterId: string;
  status: ChapterStatusValue;
  options?: ActionButtonOptions;
}) {
  const { interactive, confirmingClose, actions } = useExperienceCtx();
  const {
    useConfirmation = true,
    confirmQuestion = "¿Querés cerrar el día así como fue?",
    confirmLabel = "Sí, cerrar por hoy",
    cancelLabel = "Seguir un rato más",
    startLabel = "Abrir este día",
    closeLabel = "Dejar el día así",
  } = options;

  if (!interactive) return null;
  if (status === ChapterStatus.AVAILABLE) {
    return (
      <div className="actions">
        <button type="button" data-chapter-id={chapterId} onClick={() => actions.start(chapterId)}>
          {startLabel}
        </button>
      </div>
    );
  }
  if (status === ChapterStatus.STARTED) {
    if (!useConfirmation) {
      return (
        <div className="actions">
          <button type="button" data-chapter-id={chapterId} onClick={() => actions.complete(chapterId)}>
            {closeLabel}
          </button>
        </div>
      );
    }
    if (confirmingClose) {
      return (
        <div className="actions actions-confirm">
          <p className="confirm-question">{confirmQuestion}</p>
          <div className="confirm-buttons">
            <button type="button" data-chapter-id={chapterId} onClick={() => actions.cancelClose()}>
              {cancelLabel}
            </button>
            <button type="button" data-chapter-id={chapterId} onClick={() => actions.complete(chapterId)}>
              {confirmLabel}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="actions">
        <button type="button" data-chapter-id={chapterId} onClick={() => actions.askClose()}>
          {closeLabel}
        </button>
      </div>
    );
  }
  return null;
}
