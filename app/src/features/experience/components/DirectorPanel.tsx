import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useExperienceCtx } from "./experienceContext";
import {
  addCalendarDays,
  calendarDateFrom,
  calendarDaysBetween,
  getChapterReferenceCalendarDate,
  resolveStoryTimezone,
} from "@/features/story/engine/storyProgress";
import { StoryMode } from "@/features/story/engine/types";
import type { Chapter } from "@/features/story/engine/types";

// Modo director — SOLO QA/DEV. Permite adelantar el "hoy" simulado para revisar
// los días antes de que pasen. Escribe `?now=YYYY-MM-DDTHH:mm`; useExperience lo lee y
// recalcula la vista. La ruta que lo monta está gateada por import.meta.env.DEV,
// así que este módulo se elimina del build de producción.

const MODE_LABEL: Record<string, string> = {
  [StoryMode.PRE_TRIP]: "Pre-viaje",
  [StoryMode.IN_PROGRESS]: "En viaje",
  [StoryMode.EPILOGUE]: "Epílogo",
  [StoryMode.MEMORY_MODE]: "Recuerdos",
};

function formatDay(calendarDate: string): string {
  return new Date(`${calendarDate}T12:00:00`).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function relativeToToday(calendarDate: string, timezone?: string): string {
  const delta = calendarDaysBetween(new Date(), calendarDate, timezone);
  if (delta === 0) return "hoy";
  if (delta > 0) return `en ${delta} día${delta === 1 ? "" : "s"}`;
  const past = -delta;
  return `hace ${past} día${past === 1 ? "" : "s"}`;
}

export function DirectorPanel() {
  const { storyPackage, now, view } = useExperienceCtx();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(() => searchParams.has("director"));

  const overriding = searchParams.has("now");
  const timezone = resolveStoryTimezone(storyPackage);
  const currentOverride = searchParams.get("now");
  const currentDay = calendarDateFrom(currentOverride ?? now, timezone);
  const currentWallTime = currentOverride?.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)?.[0]
    ?? `${currentDay}T12:00`;

  function jumpTo(localDateTime: string | null) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (localDateTime) next.set("now", localDateTime);
        else next.delete("now");
        return next;
      },
      { replace: true },
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="director-panel director-panel-collapsed"
        aria-label="Abrir modo director"
        title="Modo director"
        onClick={() => setOpen(true)}
      >
        🎬
      </button>
    );
  }

  const chapters: Chapter[] = [
    ...[...storyPackage.chapters].sort((a, b) => a.order - b.order),
    ...(storyPackage.specialChapter ? [storyPackage.specialChapter] : []),
  ];

  return (
    <aside className="director-panel" aria-label="Modo director">
      <button
        type="button"
        className="director-panel-close"
        aria-label="Cerrar modo director"
        onClick={() => setOpen(false)}
      >
        ×
      </button>

      <div className="director-heading">
        <p className="director-title">Modo director</p>
        <p className="director-subtitle">
          {overriding ? `Simulando ${formatDay(currentDay)} · ${relativeToToday(currentDay, timezone)}` : "Viendo el día real"}
        </p>
      </div>

      <div className="director-section">
        <p className="director-section-label">Día simulado</p>
        <div className="director-row">
          <button type="button" onClick={() => jumpTo(`${addCalendarDays(currentDay, -1)}T${currentWallTime.slice(11)}`)}>
            ← Día anterior
          </button>
          <button type="button" onClick={() => jumpTo(`${addCalendarDays(currentDay, 1)}T${currentWallTime.slice(11)}`)}>
            Día siguiente →
          </button>
          <input
            type="datetime-local"
            value={currentWallTime}
            aria-label="Elegir fecha y hora simuladas"
            onChange={(event) => jumpTo(event.target.value || null)}
          />
        </div>
      </div>

      <div className="director-section">
        <p className="director-section-label">Saltar a un capítulo</p>
        <div className="director-stage-grid">
          {chapters.map((chapter) => {
            const day = getChapterReferenceCalendarDate(chapter, storyPackage);
            return (
              <button
                key={chapter.id}
                type="button"
                aria-current={overriding && day === currentDay}
                onClick={() => jumpTo(`${day}T07:00`)}
              >
                <strong>{chapter.title}</strong>
                <br />
                {formatDay(day)} · {relativeToToday(day, timezone)}
              </button>
            );
          })}
        </div>
      </div>

      <dl className="director-status">
        <dt>Modo</dt>
        <dd>{MODE_LABEL[view.currentMode] ?? view.currentMode}</dd>
        <dt>Capítulo visible</dt>
        <dd>{view.visibleChapter?.title ?? "—"}</dd>
      </dl>

      {overriding ? (
        <div className="director-section">
          <div className="director-row">
            <button type="button" onClick={() => jumpTo(null)}>
              ↺ Volver al día real
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
