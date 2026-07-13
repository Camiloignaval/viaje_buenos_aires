import { useEffect, useState } from "react";
import { AlaiaDatePicker } from "./AlaiaDatePicker";
import { AlaiaTimePicker } from "./AlaiaTimePicker";
import { parseCalendarDate } from "./datePickerUtils";

interface Props {
  idPrefix: string;
  dateLabel: string;
  timeLabel: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  cityName?: string | null;
  timeZone?: string;
  autoFocus?: boolean;
  initialOpen?: "date" | "time";
}

export function splitDateTimeValue(value: string): { date: string; time: string } {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return { date: "", time: "" };
  const date = value.slice(0, 10);
  const time = value.slice(11, 16);
  if (!parseCalendarDate(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return { date: "", time: "" };
  return { date, time };
}

// Dos selectores propios comparten un único estado combinado. El contrato sigue
// siendo exactamente "YYYY-MM-DDTHH:mm": no se crea Date, no se convierte a UTC
// y la hora elegida siempre representa el reloj local del destino.
export function DateTimeFields({
  idPrefix,
  dateLabel,
  timeLabel,
  value,
  onChange,
  min,
  cityName,
  timeZone,
  autoFocus,
  initialOpen,
}: Props) {
  const [date, setDate] = useState(() => splitDateTimeValue(value).date);
  const [time, setTime] = useState(() => splitDateTimeValue(value).time);

  useEffect(() => {
    const parts = splitDateTimeValue(value);
    setDate(parts.date);
    setTime(parts.time);
  }, [value]);

  function emit(nextDate: string, nextTime: string) {
    onChange(nextDate && nextTime ? `${nextDate}T${nextTime}` : "");
  }

  return (
    <div className="datetime-fields">
      <AlaiaDatePicker
        id={`${idPrefix}-date`}
        label={dateLabel}
        value={date}
        min={min}
        timeZone={timeZone}
        autoFocus={autoFocus}
        initialOpen={initialOpen === "date"}
        onConfirm={(nextDate) => {
          setDate(nextDate);
          emit(nextDate, time);
        }}
      />
      <AlaiaTimePicker
        id={`${idPrefix}-time`}
        label={timeLabel}
        value={time}
        cityName={cityName}
        initialOpen={initialOpen === "time"}
        onConfirm={(nextTime) => {
          setTime(nextTime);
          emit(date, nextTime);
        }}
      />
    </div>
  );
}
