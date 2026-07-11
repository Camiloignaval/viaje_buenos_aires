import { useEffect, useState } from "react";

interface Props {
  idPrefix: string;
  dateLabel: string;
  timeLabel: string;
  value: string; // "YYYY-MM-DDTHH:mm" completo, o "" si falta alguna de las dos partes
  onChange: (value: string) => void;
  min?: string; // fecha mínima "YYYY-MM-DD" para el input nativo de fecha
  autoFocus?: boolean;
}

function splitValue(value: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  return { date: value.slice(0, 10), time: value.slice(11, 16) };
}

// Fecha y hora como dos controles nativos separados (no un único
// datetime-local): se lee mucho más claro, el teclado mobile no mezcla dos
// tipos de picker, y cada navegador dibuja su propio widget de calendario/reloj
// de forma consistente para SU tipo, sin la variación extra de datetime-local.
// El valor combinado sigue siendo el mismo string "YYYY-MM-DDTHH:mm" de
// siempre — nada cambia río abajo (duration.ts, validación, persistencia).
export function DateTimeFields({ idPrefix, dateLabel, timeLabel, value, onChange, min, autoFocus }: Props) {
  const [date, setDate] = useState(() => splitValue(value).date);
  const [time, setTime] = useState(() => splitValue(value).time);

  // Si el valor combinado cambia desde afuera (ej. al volver a este paso desde
  // otro), resincroniza los dos campos — solo en ese sentido, nunca al revés.
  useEffect(() => {
    const parts = splitValue(value);
    setDate(parts.date);
    setTime(parts.time);
  }, [value]);

  function emit(nextDate: string, nextTime: string) {
    onChange(nextDate && nextTime ? `${nextDate}T${nextTime}` : "");
  }

  return (
    <div className="datetime-fields">
      <div className="datetime-field">
        <label htmlFor={`${idPrefix}-date`}>{dateLabel}</label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          autoFocus={autoFocus}
          min={min || undefined}
          value={date}
          onChange={(event) => {
            const nextDate = event.target.value;
            setDate(nextDate);
            emit(nextDate, time);
          }}
        />
      </div>
      <div className="datetime-field">
        <label htmlFor={`${idPrefix}-time`}>{timeLabel}</label>
        <input
          id={`${idPrefix}-time`}
          type="time"
          value={time}
          onChange={(event) => {
            const nextTime = event.target.value;
            setTime(nextTime);
            emit(date, nextTime);
          }}
        />
      </div>
    </div>
  );
}
