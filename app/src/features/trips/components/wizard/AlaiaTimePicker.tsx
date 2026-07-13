import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { AlaiaPickerDialog } from "./AlaiaPickerDialog";

interface Props {
  id: string;
  label: string;
  value: string;
  cityName?: string | null;
  onConfirm: (value: string) => void;
  initialOpen?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const BASE_MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
const PRESETS = ["08:00", "12:00", "18:00", "22:00"];

function validTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function AlaiaTimePicker({ id, label, value, cityName, onConfirm, initialOpen = false }: Props) {
  const fallback = validTime(value) ? value : "09:00";
  const [open, setOpen] = useState(initialOpen);
  const [draftHour, setDraftHour] = useState(fallback.slice(0, 2));
  const [draftMinute, setDraftMinute] = useState(fallback.slice(3, 5));
  const minutes = useMemo(
    () => Array.from(new Set([...BASE_MINUTES, draftMinute])).sort((left, right) => Number(left) - Number(right)),
    [draftMinute],
  );

  useEffect(() => {
    if (!open) return;
    const next = validTime(value) ? value : "09:00";
    setDraftHour(next.slice(0, 2));
    setDraftMinute(next.slice(3, 5));
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`#${id}-dialog [data-time-minute="${next.slice(3, 5)}"]`)
        ?.scrollIntoView?.({ block: "center" });
    });
  }, [id, open, value]);

  function moveOption(
    event: KeyboardEvent<HTMLButtonElement>,
    values: string[],
    current: string,
    select: (value: string) => void,
    kind: "hour" | "minute",
  ) {
    const index = values.indexOf(current);
    let nextIndex = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = Math.min(values.length - 1, index + 1);
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = Math.max(0, index - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = values.length - 1;
    else return;
    event.preventDefault();
    const next = values[nextIndex];
    select(next);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`#${id}-dialog [data-time-${kind}="${next}"]`)?.focus();
    });
  }

  const draft = `${draftHour}:${draftMinute}`;

  return (
    <section className="datetime-selector-block">
      <p className="datetime-selector-label">{label}</p>
      <p className={`datetime-selector-value datetime-selector-time${value ? "" : " is-empty"}`}>
        {value || "Elegí una hora"}
      </p>
      {cityName && <p className="datetime-timezone-hint">Hora de {cityName}</p>}
      <button
        type="button"
        className="datetime-selector-change"
        aria-expanded={open}
        aria-controls={`${id}-dialog`}
        onClick={() => setOpen(true)}
      >
        {value ? "Cambiar hora →" : "Elegir hora →"}
      </button>

      {open && (
        <AlaiaPickerDialog
          id={`${id}-dialog`}
          title="Elegí la hora"
          onClose={() => setOpen(false)}
          initialFocusSelector={`[data-time-hour="${draftHour}"]`}
        >
          <p className="alaia-time-context">{cityName ? `Hora de ${cityName}` : "Hora local del destino"}</p>
          <div className="alaia-time-columns">
            <div>
              <p className="alaia-time-column-label">Hora</p>
              <div className="alaia-time-list" role="listbox" aria-label="Hora">
                {HOURS.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    role="option"
                    aria-selected={draftHour === hour}
                    tabIndex={draftHour === hour ? 0 : -1}
                    data-time-hour={hour}
                    onClick={() => setDraftHour(hour)}
                    onKeyDown={(event) => moveOption(event, HOURS, draftHour, setDraftHour, "hour")}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>
            <span className="alaia-time-separator" aria-hidden="true">:</span>
            <div>
              <p className="alaia-time-column-label">Minutos</p>
              <div className="alaia-time-list" role="listbox" aria-label="Minutos">
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    role="option"
                    aria-selected={draftMinute === minute}
                    tabIndex={draftMinute === minute ? 0 : -1}
                    data-time-minute={minute}
                    onClick={() => setDraftMinute(minute)}
                    onKeyDown={(event) => moveOption(event, minutes, draftMinute, setDraftMinute, "minute")}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="alaia-time-presets" aria-label="Horas sugeridas">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={draft === preset}
                onClick={() => {
                  setDraftHour(preset.slice(0, 2));
                  setDraftMinute(preset.slice(3, 5));
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          <p className="alaia-picker-preview" aria-live="polite">{draft}</p>
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
              Usar esta hora
            </button>
          </footer>
        </AlaiaPickerDialog>
      )}
    </section>
  );
}
