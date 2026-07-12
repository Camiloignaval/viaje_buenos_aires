import { useExperienceCtx } from "./experienceContext";
import { buildChapterSummary } from "../lib/chapterSummary";
import type { ChapterSummaryEntry } from "../lib/chapterSummary";
import {
  CHAPTER_INDEX_MARKER,
  STATUS_LABEL,
  formatChapterDate,
  teaserForChapter,
  toRoman,
} from "../lib/format";
import { ChapterStatus } from "@/features/story/engine/types";

// El fragmento interno común a las tres variantes (locked / current / estático).
function ChapterIndexContent({
  entry,
  label,
  statusLine,
}: {
  entry: ChapterSummaryEntry;
  label: string;
  statusLine: string | undefined;
}) {
  return (
    <>
      <span className="chapter-index-marker" aria-hidden="true">
        {CHAPTER_INDEX_MARKER[entry.status]}
      </span>
      <span className="chapter-index-number">{toRoman(entry.order)}</span>
      <span className="chapter-index-text">
        <span className="chapter-index-title">{label}</span>
        <span className="chapter-index-status">{statusLine}</span>
      </span>
    </>
  );
}

// Espejo de renderChapterList. Tabla de contenidos de un libro — un capítulo
// futuro solo muestra su fecha (nunca su título), nunca un spoiler.
export function ChapterList({ extraClass = "" }: { extraClass?: string }) {
  const { view, storyPackage, interactive, actions } = useExperienceCtx();
  const entries = buildChapterSummary(view, storyPackage);
  return (
    <ol className={`chapter-index ${extraClass}`}>
      {entries.map((entry) => {
        const { id, order, status } = entry;
        const isLocked = status === ChapterStatus.LOCKED;
        const isCurrent =
          status === ChapterStatus.AVAILABLE || status === ChapterStatus.STARTED;
        const label = isLocked ? formatChapterDate(entry.referenceDate) : entry.title;
        const statusLine = isLocked ? teaserForChapter(order) : STATUS_LABEL[status];
        const className = [
          "chapter-index-item",
          `chapter-index-item-${status}`,
          isCurrent ? "chapter-index-item-current" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const content = (
          <ChapterIndexContent entry={entry} label={label} statusLine={statusLine} />
        );
        return (
          <li
            key={id}
            className={className}
            {...(isCurrent ? { "aria-current": "step" as const } : {})}
          >
            {isLocked && interactive ? (
              <button
                type="button"
                className="chapter-index-lock"
                data-chapter-id={id}
                data-unlock-label={label}
                aria-label={`Capítulo ${toRoman(order)} estará disponible el ${label}`}
                onClick={() => actions.openLockedChapter(id, label)}
              >
                {content}
              </button>
            ) : isCurrent && interactive ? (
              <button
                type="button"
                className="chapter-index-open"
                data-chapter-id={id}
                aria-label={`Volver al capítulo ${toRoman(order)}`}
                onClick={() => actions.resumeReading()}
              >
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}
