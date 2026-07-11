// Formatea fechas locales "YYYY-MM-DDTHH:mm" para mostrarlas — nunca ISO
// crudo, nunca UTC. Igual que duration.ts, evita a propósito `new Date(string)`
// sobre el string completo: eso lo interpretaría en el timezone del
// DISPOSITIVO, no en el del destino, y podría correr el día/hora mostrados.
// En cambio, los números YA extraídos (año/mes/día/hora/minuto — que son los
// correctos del destino, por cómo se guardan) se tratan como si fueran UTC
// (Date.UTC) y se formatean pidiendo también timeZone:"UTC": ida y vuelta se
// cancelan, así Intl solo aporta el nombre de mes/formato de hora en es-CL,
// sin ninguna conversión real de huso horario.
const DATETIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function parseLocalParts(dateTimeLocal: string): LocalParts {
  const match = DATETIME_LOCAL_PATTERN.exec(dateTimeLocal);
  if (!match) {
    throw new Error(`Fecha local inválida: ${dateTimeLocal}`);
  }
  const [, year, month, day, hour, minute] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
}

function asNeutralInstant(dateTimeLocal: string): number {
  const { year, month, day, hour, minute } = parseLocalParts(dateTimeLocal);
  return Date.UTC(year, month - 1, day, hour, minute);
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const MONTH_DAY_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "18 de julio de 2026" */
export function formatHumanDate(dateTimeLocal: string): string {
  return DATE_FORMATTER.format(asNeutralInstant(dateTimeLocal));
}

/** "09:30" (24 horas) */
export function formatHumanTime(dateTimeLocal: string): string {
  return TIME_FORMATTER.format(asNeutralInstant(dateTimeLocal));
}

/** "18 de julio de 2026 · 09:30" */
export function formatHumanDateTime(dateTimeLocal: string): string {
  return `${formatHumanDate(dateTimeLocal)} · ${formatHumanTime(dateTimeLocal)}`;
}

/**
 * Resumen compacto de un rango de fechas — pensado para un listado, donde la
 * hora no importa tanto como el rango de días:
 * mismo mes/año: "18–21 de julio de 2026"
 * mismo año, distinto mes: "30 de julio – 2 de agosto de 2026"
 * distinto año: "28 de diciembre de 2026 – 3 de enero de 2027"
 */
export function formatHumanDateRange(startDateTime: string, endDateTime: string): string {
  const start = parseLocalParts(startDateTime);
  const end = parseLocalParts(endDateTime);

  if (start.year === end.year && start.month === end.month) {
    return `${start.day}–${formatHumanDate(endDateTime)}`;
  }
  if (start.year === end.year) {
    return `${MONTH_DAY_FORMATTER.format(asNeutralInstant(startDateTime))} – ${formatHumanDate(endDateTime)}`;
  }
  return `${formatHumanDate(startDateTime)} – ${formatHumanDate(endDateTime)}`;
}
