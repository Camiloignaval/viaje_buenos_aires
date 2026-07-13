// Cálculos sobre fechas locales "YYYY-MM-DDTHH:mm" (sin timezone): la
// diferencia se hace por días calendario, nunca por horas ni por milisegundos reales.
const LATE_ARRIVAL_HOUR = 20;
const EARLY_DEPARTURE_HOUR = 11;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

function calendarDate(dateTimeLocal: string): string {
  const match = CALENDAR_DATE_PATTERN.exec(dateTimeLocal);
  if (!match) {
    throw new Error(`Fecha local inválida: ${dateTimeLocal}`);
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function hourOf(dateTimeLocal: string): number {
  return Number(dateTimeLocal.slice(11, 13));
}

function calendarOrdinal(date: string): number {
  const [year, month, day] = calendarDate(date)
    .split("-")
    .map((part) => Number(part));
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
}

export function daysBetweenCalendarDates(startDate: string, endDate: string): number {
  return calendarOrdinal(endDate) - calendarOrdinal(startDate);
}

/** "3 días · 2 noches" (o "1 día" si empieza y termina el mismo día). */
export function describeDuration(startDateTime: string, endDateTime: string): string {
  const nights = Math.max(0, daysBetweenCalendarDates(startDateTime, endDateTime));
  const days = nights + 1;
  if (nights === 0) return `${days} día`;
  return `${days} días · ${nights} noche${nights === 1 ? "" : "s"}`;
}

/** Solo la parte nocturna, para composiciones donde el rango ya comunica los días. */
export function describeNights(startDateTime: string, endDateTime: string): string {
  const nights = Math.max(0, daysBetweenCalendarDates(startDateTime, endDateTime));
  return `${nights} noche${nights === 1 ? "" : "s"}`;
}

/** Ventana útil aproximada del primer día, según la hora de llegada. */
export function firstDayHint(startDateTime: string): string | null {
  if (hourOf(startDateTime) >= LATE_ARRIVAL_HOUR) {
    return "Llegan de noche: el primer día será principalmente de descanso.";
  }
  return null;
}

/** Ventana útil aproximada del último día, según la hora de regreso. */
export function lastDayHint(endDateTime: string): string | null {
  if (hourOf(endDateTime) <= EARLY_DEPARTURE_HOUR) {
    return "Vuelven temprano: el último día será breve.";
  }
  return null;
}
