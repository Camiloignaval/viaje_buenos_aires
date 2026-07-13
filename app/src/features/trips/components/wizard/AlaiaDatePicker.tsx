import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AlaiaPickerDialog } from "./AlaiaPickerDialog";
import {
  addCalendarDays,
  addCalendarMonths,
  buildCalendarMonth,
  formatCalendarDate,
  formatCalendarMonth,
  initialCalendarDate,
  todayInTimeZone,
} from "./datePickerUtils";

interface Props {
  id: string;
  label: string;
  value: string;
  min?: string;
  timeZone?: string;
  onConfirm: (value: string) => void;
  autoFocus?: boolean;
  initialOpen?: boolean;
}

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function AlaiaDatePicker({
  id,
  label,
  value,
  min,
  timeZone,
  onConfirm,
  autoFocus,
  initialOpen = false,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(initialOpen);
  const today = useMemo(() => todayInTimeZone(timeZone), [timeZone]);
  const initial = initialCalendarDate(value, min, today);
  const [draft, setDraft] = useState(initial);
  const [focusedDate, setFocusedDate] = useState(initial);
  const [viewDate, setViewDate] = useState(initial);

  useEffect(() => {
    if (autoFocus && !initialOpen) triggerRef.current?.focus();
  }, [autoFocus, initialOpen]);

  useEffect(() => {
    if (!open) return;
    const next = initialCalendarDate(value, min, today);
    setDraft(next);
    setFocusedDate(next);
    setViewDate(next);
  }, [open, value, min, today]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`#${id}-dialog [data-calendar-date="${focusedDate}"]`)?.focus();
    });
  }, [focusedDate, id, open, viewDate]);

  const days = buildCalendarMonth(viewDate, min, today);

  function moveFocus(amount: number) {
    let next = addCalendarDays(focusedDate, amount);
    if (min && next < min) next = min;
    setFocusedDate(next);
    if (next.slice(0, 7) !== viewDate.slice(0, 7)) setViewDate(next);
  }

  function moveFocusByMonth(amount: number) {
    let next = addCalendarMonths(focusedDate, amount);
    if (min && next < min) next = min;
    setFocusedDate(next);
    setViewDate(next);
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: string, disabled: boolean) {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in moves) {
      event.preventDefault();
      moveFocus(moves[event.key]);
      return;
    }
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      moveFocusByMonth(event.key === "PageUp" ? -1 : 1);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && !disabled) {
      event.preventDefault();
      setDraft(date);
    }
  }

  return (
    <section className="datetime-selector-block">
      <p className="datetime-selector-label">{label}</p>
      <p className={`datetime-selector-value${value ? "" : " is-empty"}`}>
        {value ? formatCalendarDate(value) : "Elegí una fecha"}
      </p>
      <button
        ref={triggerRef}
        type="button"
        className="datetime-selector-change"
        aria-expanded={open}
        aria-controls={`${id}-dialog`}
        onClick={() => setOpen(true)}
      >
        {value ? "Cambiar fecha →" : "Elegir fecha →"}
      </button>

      {open && (
        <AlaiaPickerDialog
          id={`${id}-dialog`}
          title="Elegí la fecha"
          onClose={() => setOpen(false)}
          initialFocusSelector={`[data-calendar-date="${focusedDate}"]`}
        >
          <div className="alaia-calendar-toolbar">
            <button type="button" aria-label="Mes anterior" onClick={() => setViewDate(addCalendarMonths(viewDate, -1))}>
              ←
            </button>
            <p aria-live="polite">{formatCalendarMonth(viewDate)}</p>
            <button type="button" aria-label="Mes siguiente" onClick={() => setViewDate(addCalendarMonths(viewDate, 1))}>
              →
            </button>
          </div>

          <div className="alaia-calendar" role="grid" aria-label={`Calendario de ${formatCalendarMonth(viewDate)}`}>
            <div className="alaia-calendar-weekdays" role="row">
              {WEEKDAYS.map((weekday, index) => (
                <span key={`${weekday}-${index}`} role="columnheader" aria-label={["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][index]}>
                  {weekday}
                </span>
              ))}
            </div>
            <div className="alaia-calendar-days" role="rowgroup">
              {Array.from({ length: 6 }, (_, week) => (
                <div key={week} className="alaia-calendar-week" role="row">
                  {days.slice(week * 7, week * 7 + 7).map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      role="gridcell"
                      className={["alaia-calendar-day", !day.inCurrentMonth ? "is-outside" : "", day.isToday ? "is-today" : ""]
                        .filter(Boolean)
                        .join(" ")}
                      data-calendar-date={day.value}
                      aria-label={`${day.label}${day.isToday ? ", hoy" : ""}`}
                      aria-selected={draft === day.value}
                      disabled={day.disabled}
                      tabIndex={focusedDate === day.value ? 0 : -1}
                      onFocus={() => setFocusedDate(day.value)}
                      onClick={() => {
                        setDraft(day.value);
                        setFocusedDate(day.value);
                        if (!day.inCurrentMonth) setViewDate(day.value);
                      }}
                      onKeyDown={(event) => handleDayKeyDown(event, day.value, day.disabled)}
                    >
                      {day.day}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <p className="alaia-picker-preview" aria-live="polite">{formatCalendarDate(draft)}</p>
          <footer className="alaia-picker-actions">
            <button type="button" className="alaia-picker-cancel" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="alaia-picker-confirm"
              onClick={() => {
                onConfirm(draft);
                setOpen(false);
              }}
            >
              Elegir esta fecha
            </button>
          </footer>
        </AlaiaPickerDialog>
      )}
    </section>
  );
}
